import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/core/api/api_client.dart';
import 'package:ridego/core/config/storefront_app_config.dart';
import 'package:ridego/core/config/storefront_app_config_provider.dart';
import 'package:ridego/core/localization/language_contract.dart';
import 'package:ridego/features/cart/cart_provider.dart';
import 'package:ridego/shared/data/demo_app_data.dart';
import 'package:ridego/shared/models/models.dart';

void main() {
  test('cart surfaces API errors instead of creating demo items', () async {
    final Dio dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (RequestOptions options, RequestInterceptorHandler handler) {
          handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.connectionError,
            ),
          );
        },
      ),
    );
    final ProviderContainer container = ProviderContainer(
      overrides: <Override>[
        apiClientProvider.overrideWithValue(dio),
        storefrontAppConfigProvider.overrideWith(
          (_) async => _testConfig,
        ),
      ],
    );
    addTearDown(container.dispose);

    await container.read(storefrontAppConfigProvider.future);
    final CartRemote cart = container.read(cartProvider.notifier);
    await cart.refresh();

    expect(container.read(cartProvider).hasError, isTrue);

    final product = kDemoProducts.first;
    await expectLater(
      cart.addProduct(product.id, fallbackProduct: product),
      throwsA(isA<DioException>()),
    );
    expect(container.read(cartProvider).valueOrNull, isNull);
  });

  test('cart quantity respects MOQ without entering a loading state', () async {
    int serverQuantity = 8;
    int updateRequests = 0;
    int deleteRequests = 0;
    bool lineDeleted = false;
    int abandonRequests = 0;
    int manualAbandonRequests = 0;
    final Dio dio = Dio(
      BaseOptions(baseUrl: 'http://10.0.2.2:3000/api/v1'),
    );
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (RequestOptions options, RequestInterceptorHandler handler) {
          if (options.method == 'GET' && options.path == '/cart') {
            handler.resolve(
              Response<Map<String, dynamic>>(
                requestOptions: options,
                statusCode: 200,
                data: <String, dynamic>{
                  'success': true,
                  'data': <String, dynamic>{
                    'items': lineDeleted
                        ? <Map<String, dynamic>>[]
                        : <Map<String, dynamic>>[
                            <String, dynamic>{
                              'id': 'line-1',
                              'productId': 'product-1',
                              'quantity': serverQuantity,
                              'priceSnapshot': '299.00',
                              'taxRate': '5.00',
                              'moq': 8,
                              'stockQuantity': 20,
                              'product': <String, dynamic>{
                                'id': 'product-1',
                                'name': 'Wholesale item',
                                'thumbnailUrl': '/storage/products/item.jpg',
                              },
                            },
                          ],
                  },
                },
              ),
            );
            return;
          }
          if (options.method == 'DELETE' &&
              options.path == '/cart/items/line-1') {
            deleteRequests += 1;
            lineDeleted = true;
            handler.resolve(
              Response<Map<String, dynamic>>(
                requestOptions: options,
                statusCode: 200,
                data: <String, dynamic>{
                  'success': true,
                  'data': <String, dynamic>{'deleted': true},
                },
              ),
            );
            return;
          }
          if (options.method == 'PUT' && options.path == '/cart/items/line-1') {
            updateRequests += 1;
            serverQuantity =
                (options.data as Map<String, dynamic>)['quantity'] as int;
            handler.resolve(
              Response<Map<String, dynamic>>(
                requestOptions: options,
                statusCode: 200,
                data: <String, dynamic>{'success': true},
              ),
            );
            return;
          }
          if (options.method == 'POST' && options.path == '/orders') {
            final String paymentMode =
                (options.data as Map<String, dynamic>)['paymentMode'] as String;
            handler.resolve(
              Response<Map<String, dynamic>>(
                requestOptions: options,
                statusCode: 201,
                data: <String, dynamic>{
                  'success': true,
                  'data': <String, dynamic>{
                    'orderId': 'order-1',
                    'orderNumber': 'ORD-0001',
                    'totalAmount': '313.95',
                    'paymentMode': paymentMode,
                    'paymentStatus': 'PENDING',
                  },
                },
              ),
            );
            return;
          }
          if (options.method == 'POST' &&
              options.path == '/orders/order-1/razorpay/abandon') {
            abandonRequests += 1;
            handler.resolve(
              Response<Map<String, dynamic>>(
                requestOptions: options,
                statusCode: 200,
                data: <String, dynamic>{
                  'success': true,
                  'data': <String, dynamic>{
                    'orderId': 'order-1',
                    'status': 'CANCELLED',
                    'paymentStatus': 'REJECTED',
                  },
                },
              ),
            );
            return;
          }
          if (options.method == 'POST' &&
              options.path == '/orders/order-1/payment/abandon') {
            manualAbandonRequests += 1;
            handler.resolve(
              Response<Map<String, dynamic>>(
                requestOptions: options,
                statusCode: 200,
                data: <String, dynamic>{
                  'success': true,
                  'data': <String, dynamic>{
                    'orderId': 'order-1',
                    'status': 'CANCELLED',
                    'paymentStatus': 'REJECTED',
                  },
                },
              ),
            );
            return;
          }
          handler.reject(
            DioException(
              requestOptions: options,
              message: 'Unexpected request: ${options.method} ${options.path}',
            ),
          );
        },
      ),
    );
    final ProviderContainer container = ProviderContainer(
      overrides: <Override>[
        authTokenProvider.overrideWith((_) => 'test-token'),
        apiClientProvider.overrideWithValue(dio),
        storefrontAppConfigProvider.overrideWith((_) async => _testConfig),
      ],
    );
    addTearDown(container.dispose);

    await container.read(storefrontAppConfigProvider.future);
    final CartRemote cart = container.read(cartProvider.notifier);
    await cart.refresh();
    final List<bool> loadingStates = <bool>[];
    final subscription = container.listen(
      cartProvider,
      (_, AsyncValue<List<CartItem>> next) {
        loadingStates.add(next.isLoading);
      },
    );
    addTearDown(subscription.close);

    final item = container.read(cartProvider).requireValue.single;
    expect(
      item.imageUrl,
      'http://10.0.2.2:3000/storage/products/item.jpg',
    );
    await cart.updateQuantity(item, 7);
    expect(updateRequests, 0);
    expect(container.read(cartProvider).requireValue.single.quantity, 8);

    await cart.updateQuantity(item, 9);
    expect(updateRequests, 1);
    expect(container.read(cartProvider).requireValue.single.quantity, 9);
    expect(loadingStates, isNot(contains(true)));

    final CheckoutResult checkout =
        await cart.checkout(paymentMode: 'RAZORPAY');
    expect(checkout.paymentMode, 'RAZORPAY');
    expect(container.read(cartProvider).requireValue.single.quantity, 9);

    await cart.abandonOnlineCheckout(checkout.orderId);
    expect(abandonRequests, 1);
    expect(container.read(cartProvider).requireValue.single.quantity, 9);

    final CheckoutResult manualCheckout =
        await cart.checkout(paymentMode: 'UPI_QR');
    expect(manualCheckout.paymentMode, 'UPI_QR');
    expect(container.read(cartProvider).requireValue.single.quantity, 9);

    await cart.abandonPendingPaymentCheckout(manualCheckout.orderId);
    expect(manualAbandonRequests, 1);
    expect(container.read(cartProvider).requireValue.single.quantity, 9);

    expect(checkoutKeepsCartUntilPayment('UPI_QR'), isTrue);
    expect(checkoutKeepsCartUntilPayment('NEFT'), isTrue);
    expect(checkoutKeepsCartUntilPayment('RAZORPAY'), isTrue);
    expect(checkoutKeepsCartUntilPayment('CASH'), isFalse);
    expect(checkoutKeepsCartUntilPayment('CREDIT'), isFalse);

    await cart.removeLine(item.lineId!);
    expect(deleteRequests, 1);
    expect(container.read(cartProvider).requireValue, isEmpty);

    expect(
      availableCreditAmount(creditLimit: 5000, outstanding: 1250),
      3750,
    );
    expect(
      creditCoversOrder(
        creditLimit: 5000,
        outstanding: 1250,
        orderTotal: 3750,
      ),
      isTrue,
    );
    expect(
      creditCoversOrder(
        creditLimit: 5000,
        outstanding: 1250,
        orderTotal: 3750.01,
      ),
      isFalse,
    );
  });

  test('Buy Now checkout sends an isolated line and never mutates cart',
      () async {
    Map<String, dynamic>? orderBody;
    final Dio dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (RequestOptions options, RequestInterceptorHandler handler) {
          if (options.method == 'GET' && options.path == '/cart') {
            handler.resolve(
              Response<Map<String, dynamic>>(
                requestOptions: options,
                statusCode: 200,
                data: <String, dynamic>{
                  'success': true,
                  'data': <String, dynamic>{
                    'items': <Map<String, dynamic>>[
                      <String, dynamic>{
                        'id': 'existing-line',
                        'productId': 'existing-product',
                        'quantity': 2,
                        'priceSnapshot': '50.00',
                        'product': <String, dynamic>{
                          'name': 'Existing cart item'
                        },
                      },
                    ],
                  },
                },
              ),
            );
            return;
          }
          if (options.method == 'POST' && options.path == '/orders') {
            orderBody = Map<String, dynamic>.from(options.data as Map);
            handler.resolve(
              Response<Map<String, dynamic>>(
                requestOptions: options,
                statusCode: 201,
                data: <String, dynamic>{
                  'success': true,
                  'data': <String, dynamic>{
                    'orderId': 'buy-now-order',
                    'orderNumber': 'ORD-BUY-NOW',
                    'totalAmount': '105.00',
                    'paymentMode': 'CASH',
                    'paymentStatus': 'PENDING',
                  },
                },
              ),
            );
            return;
          }
          handler.reject(
            DioException(
              requestOptions: options,
              message: 'Unexpected request: ${options.method} ${options.path}',
            ),
          );
        },
      ),
    );
    final ProviderContainer container = ProviderContainer(
      overrides: <Override>[
        authTokenProvider.overrideWith((_) => 'test-token'),
        apiClientProvider.overrideWithValue(dio),
        storefrontAppConfigProvider.overrideWith((_) async => _testConfig),
      ],
    );
    addTearDown(container.dispose);

    await container.read(storefrontAppConfigProvider.future);
    final CartRemote cart = container.read(cartProvider.notifier);
    await cart.refresh();
    final List<CartItem> cartBefore = container.read(cartProvider).requireValue;
    const CartItem buyNowItem = CartItem(
      productId: '2ef43f94-bc10-57b6-92bf-6aad433b01a5',
      variantId: '4f1146a6-5b7b-4c90-9cf0-2ac45684afde',
      name: 'Buy Now product',
      quantity: 1,
      unitPrice: 100,
      taxRate: 5,
    );

    await cart.checkout(paymentMode: 'CASH', buyNowItem: buyNowItem);

    expect(orderBody, <String, dynamic>{
      'paymentMode': 'CASH',
      'buyNow': <String, dynamic>{
        'productId': buyNowItem.productId,
        'variantId': buyNowItem.variantId,
        'quantity': 1,
      },
    });
    expect(container.read(cartProvider).requireValue, same(cartBefore));
    expect(container.read(cartProvider).requireValue.single.productId,
        'existing-product');
  });
}

const StorefrontAppConfig _testConfig = StorefrontAppConfig(
  allowGuestAccess: true,
  showPricesToGuest: true,
  allowGuestCart: true,
  enableRepeatOrder: true,
  enableCreditView: true,
  enableNotifications: true,
  defaultHomeLayout: 'grid',
  showBanner: true,
  selectedLanguageCode: 'en',
  languageContract: LocalizationContract(
    languageCode: 'en',
    locale: 'en_IN',
    direction: TextDirection.ltr,
    revision: 0,
    supportedLanguages: enterpriseSupportedLanguages,
    source: 'test',
  ),
);
