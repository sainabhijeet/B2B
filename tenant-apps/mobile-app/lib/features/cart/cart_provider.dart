import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/nest_json.dart';
import '../../core/config/storefront_app_config.dart';
import '../../core/config/storefront_app_config_provider.dart';
import '../../shared/models/models.dart';

bool checkoutKeepsCartUntilPayment(String paymentMode) {
  final String mode = paymentMode.trim().toUpperCase();
  return mode == 'RAZORPAY' || mode == 'UPI_QR' || mode == 'NEFT';
}

double availableCreditAmount({
  required double creditLimit,
  required double outstanding,
}) {
  return (creditLimit - outstanding).clamp(0, double.infinity).toDouble();
}

bool creditCoversOrder({
  required double creditLimit,
  required double outstanding,
  required double orderTotal,
}) {
  return creditLimit > 0 &&
      orderTotal <=
          availableCreditAmount(
                creditLimit: creditLimit,
                outstanding: outstanding,
              ) +
              0.000001;
}

class CheckoutPaymentInstructions {
  const CheckoutPaymentInstructions({
    required this.mode,
    required this.status,
    required this.orderId,
    required this.orderNumber,
    required this.amount,
    required this.currency,
    this.upiId,
    this.payeeName,
    this.retailerName,
    this.transactionNote,
    this.upiUri,
  });

  final String mode;
  final String status;
  final String orderId;
  final String orderNumber;
  final double amount;
  final String currency;
  final String? upiId;
  final String? payeeName;
  final String? retailerName;
  final String? transactionNote;
  final String? upiUri;
}

class CheckoutResult {
  const CheckoutResult({
    required this.orderId,
    required this.orderNumber,
    required this.totalAmount,
    required this.paymentMode,
    required this.paymentStatus,
    this.paymentInstructions,
  });

  final String orderId;
  final String orderNumber;
  final double totalAmount;
  final String paymentMode;
  final String paymentStatus;
  final CheckoutPaymentInstructions? paymentInstructions;
}

class CartRemote extends StateNotifier<AsyncValue<List<CartItem>>> {
  CartRemote(this._ref) : super(const AsyncValue.loading()) {
    _ref.listen<String?>(authTokenProvider, (_, __) => refresh());
    _ref.listen<AsyncValue<StorefrontAppConfig>>(
      storefrontAppConfigProvider,
      (_, __) => refresh(),
    );
    refresh();
  }

  final Ref _ref;

  StorefrontAppConfig? _resolvedConfig() {
    return _ref.read(storefrontAppConfigProvider).asData?.value;
  }

  Future<void> refresh({bool showLoading = true}) async {
    final List<CartItem>? currentItems = state.valueOrNull;
    final StorefrontAppConfig? cfg = _resolvedConfig();
    if (cfg == null) {
      if (_ref.read(storefrontAppConfigProvider).isLoading) {
        if (showLoading || currentItems == null) {
          state = const AsyncValue.loading();
        }
      } else {
        state = const AsyncValue.data(<CartItem>[]);
      }
      return;
    }

    final String? token = _ref.read(authTokenProvider);
    final bool authed = token != null && token.isNotEmpty;

    if (authed) {
      if (showLoading || currentItems == null) {
        state = const AsyncValue.loading();
      }
      try {
        final Dio dio = _ref.read(apiClientProvider);
        final res = await dio.get<Map<String, dynamic>>('/cart');
        final Object? data = nestEnvelopeData(res.data);
        if (data is! Map) {
          throw const FormatException('Cart response is invalid.');
        }
        final rows = (data['items'] as List<dynamic>? ?? <dynamic>[]);
        final items = rows
            .whereType<Map>()
            .map(_mapAuthenticatedLine)
            .toList(growable: false);
        state = AsyncValue.data(items);
      } catch (error, stackTrace) {
        if (showLoading || currentItems == null) {
          state = AsyncValue<List<CartItem>>.error(error, stackTrace);
        }
      }
      return;
    }

    if (!cfg.allowGuestCart) {
      state = const AsyncValue.data(<CartItem>[]);
      return;
    }

    if (showLoading || currentItems == null) {
      state = const AsyncValue.loading();
    }
    try {
      final Dio dio = _ref.read(apiClientProvider);
      final res = await dio.get<Map<String, dynamic>>('/storefront/guest-cart');
      final Object? data = nestEnvelopeData(res.data);
      if (data is! Map) {
        throw const FormatException('Guest cart response is invalid.');
      }
      final rows = (data['items'] as List<dynamic>? ?? <dynamic>[]);
      final items =
          rows.whereType<Map>().map(_mapGuestLine).toList(growable: false);
      state = AsyncValue.data(items);
    } catch (error, stackTrace) {
      if (showLoading || currentItems == null) {
        state = AsyncValue<List<CartItem>>.error(error, stackTrace);
      }
    }
  }

  CartItem _mapAuthenticatedLine(Map raw) {
    final Map<String, dynamic> e = Map<String, dynamic>.from(raw);
    final Map<String, dynamic>? product = e['product'] as Map<String, dynamic>?;
    final double price =
        double.tryParse('${e['priceSnapshot'] ?? e['price_snapshot'] ?? 0}') ??
            0;
    return CartItem(
      lineId: '${e['id']}',
      productId: '${e['productId'] ?? e['product_id']}',
      name: product != null ? '${product['name']}' : 'Item',
      quantity: (e['quantity'] as num?)?.toInt() ?? 0,
      unitPrice: price,
      variantId: _optionalText(e['variantId'] ?? e['variant_id']),
      variantName: _optionalText(
        e['variantName'] ??
            e['variant_name'] ??
            (e['variant'] is Map ? (e['variant'] as Map)['name'] : null),
      ),
      imageUrl: _productImage(product),
      taxRate: _money(e['taxRate'] ?? e['tax_rate']),
      moq: _int(e['moq'] ?? product?['moq'], 1),
      stockQuantity: _optionalInt(
        e['stockQuantity'] ?? e['stock_quantity'] ?? product?['stockQuantity'],
      ),
    );
  }

  CartItem _mapGuestLine(Map raw) {
    final Map<String, dynamic> e = Map<String, dynamic>.from(raw);
    final Map<String, dynamic>? product = e['product'] as Map<String, dynamic>?;
    final double price =
        double.tryParse('${e['priceSnapshot'] ?? e['price_snapshot'] ?? 0}') ??
            0;
    return CartItem(
      lineId: '${e['id']}',
      productId: '${e['productId'] ?? e['product_id']}',
      name: product != null ? '${product['name']}' : 'Item',
      quantity: (e['quantity'] as num?)?.toInt() ?? 0,
      unitPrice: price,
      variantId: _optionalText(e['variantId'] ?? e['variant_id']),
      variantName: _optionalText(
        e['variantName'] ??
            e['variant_name'] ??
            (e['variant'] is Map ? (e['variant'] as Map)['name'] : null),
      ),
      imageUrl: _productImage(product),
      taxRate: _money(e['taxRate'] ?? e['tax_rate']),
      moq: _int(e['moq'] ?? product?['moq'], 1),
      stockQuantity: _optionalInt(
        e['stockQuantity'] ?? e['stock_quantity'] ?? product?['stockQuantity'],
      ),
    );
  }

  Future<void> addProduct(
    String productId, {
    int quantity = 1,
    Product? fallbackProduct,
    String? variantId,
  }) async {
    final Product? fallback = fallbackProduct;
    final ProductVariant? variant = _variantById(fallback, variantId);
    final int moq = variant?.moq ?? fallback?.moq ?? 1;
    final int safeQuantity = quantity < moq ? moq : quantity;
    final int? stock = variant?.stockQuantity ?? fallback?.stockQuantity;
    if (stock != null && stock >= 0 && safeQuantity > stock) {
      throw StateError('Only $stock units are available.');
    }
    final Dio dio = _ref.read(apiClientProvider);
    final String? token = _ref.read(authTokenProvider);
    if (token != null && token.isNotEmpty) {
      await dio.post<Map<String, dynamic>>(
        '/cart/items',
        data: <String, dynamic>{
          'productId': productId,
          if (variantId != null) 'variantId': variantId,
          'quantity': safeQuantity,
        },
      );
    } else {
      await dio.post<Map<String, dynamic>>(
        '/storefront/guest-cart/items',
        data: <String, dynamic>{
          'productId': productId,
          if (variantId != null) 'variantId': variantId,
          'quantity': safeQuantity,
        },
      );
    }
    await refresh(showLoading: false);
  }

  Future<void> updateQuantity(CartItem item, int quantity) async {
    final int nextQuantity = quantity < item.moq ? item.moq : quantity;
    if (nextQuantity == item.quantity) return;
    if (item.stockQuantity != null &&
        item.stockQuantity! >= 0 &&
        nextQuantity > item.stockQuantity!) {
      throw StateError('Only ${item.stockQuantity} units are available.');
    }
    double nextPrice = item.unitPrice;
    final List<PriceSlab> activeSlabs = item.priceSlabs
        .where((PriceSlab slab) => nextQuantity >= slab.minQty)
        .toList(growable: false)
      ..sort((PriceSlab a, PriceSlab b) => b.minQty.compareTo(a.minQty));
    if (activeSlabs.isNotEmpty) nextPrice = activeSlabs.first.price;

    final current = state.valueOrNull ?? const <CartItem>[];
    final previousState = state;
    state = AsyncValue.data(
      current
          .map(
            (CartItem row) => row.lineId == item.lineId && item.lineId != null
                ? row.copyWith(quantity: nextQuantity, unitPrice: nextPrice)
                : row.productId == item.productId && item.lineId == null
                    ? row.copyWith(quantity: nextQuantity, unitPrice: nextPrice)
                    : row,
          )
          .toList(growable: false),
    );

    final String? lineId = item.lineId;
    if (lineId == null) return;

    final Dio dio = _ref.read(apiClientProvider);
    final String? token = _ref.read(authTokenProvider);
    try {
      if (token != null && token.isNotEmpty) {
        await dio.put<Map<String, dynamic>>(
          '/cart/items/$lineId',
          data: <String, dynamic>{'quantity': nextQuantity},
        );
      } else if (nextQuantity > item.quantity) {
        await dio.post<Map<String, dynamic>>(
          '/storefront/guest-cart/items',
          data: <String, dynamic>{
            'productId': item.productId,
            if (item.variantId != null) 'variantId': item.variantId,
            'quantity': nextQuantity - item.quantity,
          },
        );
      } else {
        await dio.delete<Map<String, dynamic>>(
          '/storefront/guest-cart/items/$lineId',
        );
        await dio.post<Map<String, dynamic>>(
          '/storefront/guest-cart/items',
          data: <String, dynamic>{
            'productId': item.productId,
            if (item.variantId != null) 'variantId': item.variantId,
            'quantity': nextQuantity,
          },
        );
      }
    } catch (error, stackTrace) {
      state = previousState;
      Error.throwWithStackTrace(error, stackTrace);
    }
    await refresh(showLoading: false);
  }

  Future<CheckoutResult> checkout({
    String? addressId,
    String paymentMode = 'UPI_QR',
    String? couponCode,
    CartItem? buyNowItem,
  }) async {
    final String? token = _ref.read(authTokenProvider);
    if (token == null || token.isEmpty) {
      throw StateError('Sign in before checkout.');
    }
    final Dio dio = _ref.read(apiClientProvider);
    final List<CartItem> current = buyNowItem == null
        ? (state.valueOrNull ?? const <CartItem>[])
        : <CartItem>[buyNowItem];
    for (final CartItem item in current) {
      if (item.belowMoq) {
        throw StateError('${item.name} requires minimum quantity ${item.moq}.');
      }
      if (item.exceedsStock) {
        throw StateError(
            '${item.name} has only ${item.stockQuantity} in stock.');
      }
    }
    final response = await dio.post<Map<String, dynamic>>(
      '/orders',
      data: <String, dynamic>{
        if (addressId != null && addressId.isNotEmpty) 'addressId': addressId,
        'paymentMode': paymentMode,
        if (buyNowItem != null)
          'buyNow': <String, dynamic>{
            'productId': buyNowItem.productId,
            if (buyNowItem.variantId != null) 'variantId': buyNowItem.variantId,
            'quantity': buyNowItem.quantity,
          },
        if (couponCode != null && couponCode.trim().isNotEmpty)
          'couponCode': couponCode.trim().toUpperCase(),
      },
    );
    final data = nestEnvelopeData(response.data);
    if (data is! Map) {
      throw const FormatException('Checkout response is invalid.');
    }
    final CheckoutResult result =
        _checkoutResultFromJson(Map<String, dynamic>.from(data));
    if (buyNowItem == null &&
        !checkoutKeepsCartUntilPayment(result.paymentMode)) {
      state = const AsyncValue.data(<CartItem>[]);
    }
    return result;
  }

  Future<void> syncAfterCheckout() => refresh(showLoading: false);

  Future<void> abandonOnlineCheckout(String orderId) async {
    final Dio dio = _ref.read(apiClientProvider);
    await dio.post<Map<String, dynamic>>(
      '/orders/$orderId/razorpay/abandon',
    );
    await refresh(showLoading: false);
  }

  Future<void> abandonPendingPaymentCheckout(String orderId) async {
    final Dio dio = _ref.read(apiClientProvider);
    await dio.post<Map<String, dynamic>>(
      '/orders/$orderId/payment/abandon',
    );
    await refresh(showLoading: false);
  }

  Future<void> removeLine(String lineId) async {
    final Dio dio = _ref.read(apiClientProvider);
    final String? token = _ref.read(authTokenProvider);
    final previousState = state;
    final current = state.valueOrNull ?? const <CartItem>[];
    state = AsyncValue.data(
      current
          .where((CartItem item) => item.lineId != lineId)
          .toList(growable: false),
    );
    try {
      if (token != null && token.isNotEmpty) {
        await dio.delete<Map<String, dynamic>>('/cart/items/$lineId');
      } else {
        await dio.delete<Map<String, dynamic>>(
            '/storefront/guest-cart/items/$lineId');
      }
      await refresh(showLoading: false);
    } catch (error, stackTrace) {
      state = previousState;
      Error.throwWithStackTrace(error, stackTrace);
    }
  }
}

final cartProvider =
    StateNotifierProvider<CartRemote, AsyncValue<List<CartItem>>>(
  CartRemote.new,
);

final cartTotalProvider = Provider<double>((Ref ref) {
  final AsyncValue<List<CartItem>> async = ref.watch(cartProvider);
  return async.maybeWhen(
    data: (List<CartItem> items) =>
        items.fold<double>(0, (double s, CartItem e) => s + e.lineTotal),
    orElse: () => 0,
  );
});

final cartTaxProvider = Provider<double>((Ref ref) {
  final AsyncValue<List<CartItem>> async = ref.watch(cartProvider);
  return async.maybeWhen(
    data: (List<CartItem> items) => items.fold<double>(
      0,
      (double sum, CartItem item) => sum + item.taxAmount,
    ),
    orElse: () => 0,
  );
});

final cartGrandTotalProvider = Provider<double>((Ref ref) {
  return ref.watch(cartTotalProvider) + ref.watch(cartTaxProvider);
});

CheckoutResult _checkoutResultFromJson(Map<String, dynamic> json) {
  final rawInstructions =
      json['paymentInstructions'] ?? json['payment_instructions'];
  return CheckoutResult(
    orderId: (json['orderId'] ?? json['order_id'] ?? '').toString(),
    orderNumber: (json['orderNumber'] ?? json['order_number'] ?? '').toString(),
    totalAmount: _num(json['totalAmount'] ?? json['total_amount']),
    paymentMode: (json['paymentMode'] ?? json['payment_mode'] ?? '').toString(),
    paymentStatus:
        (json['paymentStatus'] ?? json['payment_status'] ?? '').toString(),
    paymentInstructions: rawInstructions is Map
        ? _paymentInstructionsFromJson(
            Map<String, dynamic>.from(rawInstructions))
        : null,
  );
}

CheckoutPaymentInstructions _paymentInstructionsFromJson(
  Map<String, dynamic> json,
) {
  return CheckoutPaymentInstructions(
    mode: (json['mode'] ?? '').toString(),
    status: (json['status'] ?? '').toString(),
    orderId: (json['orderId'] ?? '').toString(),
    orderNumber: (json['orderNumber'] ?? '').toString(),
    amount: _num(json['amount']),
    currency: (json['currency'] ?? 'INR').toString(),
    upiId: json['upiId']?.toString(),
    payeeName: json['payeeName']?.toString(),
    retailerName: json['retailerName']?.toString(),
    transactionNote: json['transactionNote']?.toString(),
    upiUri: json['upiUri']?.toString(),
  );
}

double _num(Object? value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

double _money(Object? raw) {
  if (raw is num) return raw.toDouble();
  return double.tryParse('$raw') ?? 0;
}

int _int(Object? raw, [int fallback = 0]) {
  if (raw is num) return raw.toInt();
  return int.tryParse('${raw ?? ''}') ?? fallback;
}

int? _optionalInt(Object? raw) {
  if (raw == null) return null;
  if (raw is num) return raw.toInt();
  return int.tryParse('$raw');
}

ProductVariant? _variantById(Product? product, String? variantId) {
  if (product == null || variantId == null) return null;
  for (final ProductVariant variant in product.variants) {
    if (variant.id == variantId) return variant;
  }
  return null;
}

String? _optionalText(Object? raw) {
  final String value = '${raw ?? ''}'.trim();
  return value.isEmpty || value == 'null' ? null : value;
}

String? _productImage(Map<String, dynamic>? product) {
  if (product == null) return null;
  final String? direct = _optionalText(
    product['imageUrl'] ??
        product['image_url'] ??
        product['thumbnailUrl'] ??
        product['thumbnail_url'],
  );
  if (direct != null) return direct;

  final Object? rawImages = product['images'];
  if (rawImages is! List || rawImages.isEmpty) return null;
  final Object? first = rawImages.first;
  if (first is String) return _optionalText(first);
  if (first is Map) {
    return _optionalText(
        first['imageUrl'] ?? first['image_url'] ?? first['url']);
  }
  return null;
}
