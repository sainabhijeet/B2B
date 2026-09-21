import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/api/api_client.dart';
import '../../core/api/dio_errors.dart';
import '../../core/config/storefront_app_config.dart';
import '../../core/config/storefront_app_config_provider.dart';
import '../../core/config/user_app_settings_provider.dart';
import '../../core/localization/language_provider.dart';
import '../../core/navigation/app_navigation.dart';
import '../../shared/models/models.dart';
import '../../shared/widgets/app_feedback.dart';
import '../auth/auth_screen.dart';
import '../b2b/b2b_providers.dart';
import '../b2b/b2b_screens.dart';
import '../orders/orders_provider.dart';
import '../payments/razorpay_order_checkout.dart';
import '../products/products_provider.dart';
import '../settings/customer_profile_provider.dart';
import '../settings/settings_detail_screens.dart';
import 'cart_provider.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({
    super.key,
    this.checkoutMode = false,
    this.buyNowItem,
  });

  final bool checkoutMode;
  final CartItem? buyNowItem;

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  bool _checkingOut = false;
  bool _defaultPaymentApplied = false;
  final Set<String> _updatingItems = <String>{};
  String _paymentMode = 'UPI_QR';
  final TextEditingController _utr = TextEditingController();
  final TextEditingController _coupon = TextEditingController();

  @override
  void dispose() {
    _utr.dispose();
    _coupon.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<StorefrontAppConfig> configAsync =
        ref.watch(storefrontAppConfigProvider);
    final String Function(String) t = ref.watch(appTranslatorProvider);

    return configAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (Object error, StackTrace _) =>
          Center(child: Text('${t('Settings')}: $error')),
      data: (_) {
        final String? token = ref.watch(authTokenProvider);
        final bool guest = token == null || token.isEmpty;
        final UserAppSettings settings = ref.watch(userAppSettingsProvider);
        if (guest && !settings.guestCartEnabled) {
          return _CartPreferenceMessage(
            onOpenSettings: () =>
                ref.read(selectedTabProvider.notifier).state = 4,
          );
        }

        final AsyncValue<List<CartItem>> cartAsync = widget.buyNowItem == null
            ? ref.watch(cartProvider)
            : AsyncValue<List<CartItem>>.data(<CartItem>[widget.buyNowItem!]);
        final List<Product> products =
            ref.watch(productsProvider).valueOrNull ?? const <Product>[];
        final AsyncValue<CustomerProfile?> profileAsync =
            ref.watch(customerProfileProvider);
        final CustomerProfile? profile = profileAsync.valueOrNull;
        final localization = ref.watch(mobileLocalizationServiceProvider);

        return cartAsync.when(
          data: (List<CartItem> items) {
            if (items.isEmpty) {
              return _EmptyCart(
                guest: guest,
                t: t,
                onBrowse: () =>
                    ref.read(selectedTabProvider.notifier).state = 0,
              );
            }

            final double subtotal = items.fold<double>(
              0,
              (double sum, CartItem item) => sum + item.lineTotal,
            );
            final double tax = items.fold<double>(
              0,
              (double sum, CartItem item) => sum + item.taxAmount,
            );
            final double total = subtotal + tax;

            final CustomerAddress? address =
                _selectedAddress(profile?.addresses ?? const [], settings);
            if (widget.checkoutMode &&
                !_defaultPaymentApplied &&
                (guest || profile != null)) {
              _defaultPaymentApplied = true;
              if (settings.defaultPaymentMethod
                      .toLowerCase()
                      .contains('credit') &&
                  profile != null &&
                  creditCoversOrder(
                    creditLimit: profile.creditLimit,
                    outstanding: profile.creditBalance,
                    orderTotal: total,
                  )) {
                _paymentMode = 'CREDIT';
              }
            }

            return Column(
              children: <Widget>[
                Expanded(
                  child: ColoredBox(
                    color: Theme.of(context).colorScheme.surfaceContainerLowest,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
                      children: <Widget>[
                        if (widget.checkoutMode) ...<Widget>[
                          _SectionTitle(t('Delivery Details')),
                          const SizedBox(height: 10),
                          _DeliveryCard(
                            address: address,
                            guest: guest,
                            t: t,
                            onChange: () => _changeDeliveryAddress(
                              context,
                              guest,
                            ),
                          ),
                          const SizedBox(height: 24),
                          _SectionTitle(t('Order Summary')),
                          const SizedBox(height: 10),
                          _CheckoutOrderSummaryCard(
                            items: items,
                            t: t,
                            formatCurrency: localization.formatCurrency,
                          ),
                        ] else ...<Widget>[
                          _SectionTitle(t('Order Details')),
                          const SizedBox(height: 10),
                          for (int index = 0;
                              index < items.length;
                              index++) ...<Widget>[
                            _CartItemCard(
                              item: items[index],
                              imageUrl: _productImage(items[index], products),
                              t: t,
                              formatCurrency: localization.formatCurrency,
                              onDecrease: _checkingOut ||
                                      _isUpdating(items[index]) ||
                                      items[index].quantity <= items[index].moq
                                  ? null
                                  : () => _changeQuantity(
                                        items[index],
                                        items[index].quantity - 1,
                                      ),
                              onIncrease: _checkingOut ||
                                      _isUpdating(items[index]) ||
                                      (items[index].stockQuantity != null &&
                                          items[index].quantity >=
                                              items[index].stockQuantity!)
                                  ? null
                                  : () => _changeQuantity(
                                        items[index],
                                        items[index].quantity + 1,
                                      ),
                              onRemove: _checkingOut ||
                                      _isUpdating(items[index]) ||
                                      items[index].lineId == null
                                  ? null
                                  : () => _removeItem(items[index]),
                            ),
                            if (index != items.length - 1)
                              const SizedBox(height: 12),
                          ],
                        ],
                        const SizedBox(height: 24),
                        _SectionTitle(t('Price Details')),
                        const SizedBox(height: 10),
                        _PriceDetailsCard(
                          subtotal: subtotal,
                          tax: tax,
                          total: total,
                          t: t,
                          formatCurrency: localization.formatCurrency,
                        ),
                        if (widget.checkoutMode) ...<Widget>[
                          const SizedBox(height: 24),
                          _SectionTitle(t('Coupon code')),
                          const SizedBox(height: 10),
                          TextField(
                            controller: _coupon,
                            textCapitalization: TextCapitalization.characters,
                            inputFormatters: <TextInputFormatter>[
                              FilteringTextInputFormatter.allow(
                                RegExp(r'[A-Za-z0-9_-]'),
                              ),
                              LengthLimitingTextInputFormatter(40),
                            ],
                            decoration: InputDecoration(
                              hintText: t('Coupon code'),
                              prefixIcon: const Icon(Icons.sell_outlined),
                              border: const OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 24),
                          _SectionTitle(t('Payment method')),
                          const SizedBox(height: 10),
                          _PaymentMethodCard(
                            selected: _paymentMode,
                            utrController: _utr,
                            total: total,
                            profile: profile,
                            onSelected: (String value) {
                              setState(() {
                                _defaultPaymentApplied = true;
                                _paymentMode = value;
                              });
                            },
                            onOpenUpi: () => Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) =>
                                    DistributorPaymentSettingsScreen(
                                  amount: total,
                                  orderId: 'Checkout',
                                ),
                              ),
                            ),
                          ),
                          if (guest) ...<Widget>[
                            const SizedBox(height: 12),
                            _GuestCheckoutNotice(t: t),
                          ],
                        ],
                      ],
                    ),
                  ),
                ),
                _CheckoutBar(
                  label: widget.checkoutMode
                      ? _paymentMode == 'RAZORPAY'
                          ? t('Pay Online')
                          : _paymentMode == 'CREDIT' || _paymentMode == 'CASH'
                              ? t('Place Order')
                              : t('Submit Payment')
                      : t('Proceed to Checkout'),
                  totalLabel: localization.formatCurrency(total),
                  loading: _checkingOut,
                  onPressed: widget.checkoutMode
                      ? () => _checkout(
                            guest: guest,
                            address: address,
                            paymentMode: _paymentMode,
                            couponCode: _coupon.text,
                          )
                      : () => Navigator.of(context).pushNamed(
                            checkoutRouteName,
                          ),
                ),
              ],
            );
          },
          error: (Object error, _) => _CartError(
            message: '${t('Cart error')}: $error',
            retryLabel: t('Retry'),
            onRetry: () => ref.read(cartProvider.notifier).refresh(),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
        );
      },
    );
  }

  CustomerAddress? _selectedAddress(
    List<CustomerAddress> addresses,
    UserAppSettings settings,
  ) {
    if (addresses.isEmpty) return null;
    for (final CustomerAddress address in addresses) {
      if (address.id == settings.defaultAddressId) return address;
    }
    for (final CustomerAddress address in addresses) {
      if (address.isDefault) return address;
    }
    return addresses.first;
  }

  String? _productImage(CartItem item, List<Product> products) {
    final String itemImage = item.imageUrl?.trim() ?? '';
    if (itemImage.isNotEmpty) return itemImage;
    for (final Product product in products) {
      if (product.id == item.productId &&
          product.imageUrl?.trim().isNotEmpty == true) {
        return product.imageUrl!.trim();
      }
    }
    return null;
  }

  String _itemKey(CartItem item) =>
      item.lineId ?? '${item.productId}:${item.variantId ?? ''}';

  bool _isUpdating(CartItem item) => _updatingItems.contains(_itemKey(item));

  Future<void> _changeQuantity(CartItem item, int quantity) async {
    final String key = _itemKey(item);
    if (_updatingItems.contains(key) || _checkingOut) return;
    setState(() => _updatingItems.add(key));
    try {
      await ref.read(cartProvider.notifier).updateQuantity(item, quantity);
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: _checkoutError(error),
        type: AppFeedbackType.error,
      );
    } finally {
      if (mounted) setState(() => _updatingItems.remove(key));
    }
  }

  Future<void> _removeItem(CartItem item) async {
    final String? lineId = item.lineId;
    if (lineId == null) return;
    final String key = _itemKey(item);
    if (_updatingItems.contains(key) || _checkingOut) return;
    setState(() => _updatingItems.add(key));
    try {
      await ref.read(cartProvider.notifier).removeLine(lineId);
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: _checkoutError(error),
        type: AppFeedbackType.error,
      );
    } finally {
      if (mounted) setState(() => _updatingItems.remove(key));
    }
  }

  Future<void> _changeDeliveryAddress(
    BuildContext context,
    bool guest,
  ) async {
    if (guest) {
      await _openSignIn(context);
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (BuildContext context) => const AddressBookScreen(),
      ),
    );
    if (mounted) ref.invalidate(customerProfileProvider);
  }

  void _finishCheckoutOnTab(int tabIndex) {
    final selectedTab = ref.read(selectedTabProvider.notifier);
    // Update the shell before removing Checkout. The shell is still on the Cart
    // tab underneath this route, so popping first briefly exposes Cart and only
    // then rebuilds the requested destination.
    selectedTab.state = tabIndex;
    if (widget.checkoutMode) {
      Navigator.of(context).popUntil((Route<dynamic> route) => route.isFirst);
    }
  }

  Future<void> _checkout({
    required bool guest,
    required CustomerAddress? address,
    required String paymentMode,
    required String couponCode,
  }) async {
    if (guest) {
      await _openSignIn(context);
      return;
    }
    if (address == null) {
      showAppFeedback(
        context,
        message: 'Please add a delivery address before checkout.',
        type: AppFeedbackType.info,
      );
      return;
    }
    if (_checkingOut) return;
    setState(() => _checkingOut = true);
    try {
      CustomerProfile? checkoutProfile;
      if (paymentMode == 'RAZORPAY' || paymentMode == 'CREDIT') {
        ref.invalidate(customerProfileProvider);
        checkoutProfile = await ref.read(customerProfileProvider.future);
        if (!mounted) return;
      }
      if (paymentMode == 'RAZORPAY') {
        if (checkoutProfile == null || checkoutProfile.mobile.trim().isEmpty) {
          throw StateError(
            'Add a mobile number to your Profile before paying online.',
          );
        }
      }
      if (paymentMode == 'CREDIT') {
        if (checkoutProfile == null) {
          throw StateError('Unable to load your approved credit details.');
        }
        final double orderTotal = ref.read(cartGrandTotalProvider);
        final double available = availableCreditAmount(
          creditLimit: checkoutProfile.creditLimit,
          outstanding: checkoutProfile.creditBalance,
        );
        if (!creditCoversOrder(
          creditLimit: checkoutProfile.creditLimit,
          outstanding: checkoutProfile.creditBalance,
          orderTotal: orderTotal,
        )) {
          throw StateError(
            checkoutProfile.creditLimit <= 0
                ? 'Credit Terms are not approved for this account. Contact your distributor.'
                : 'Available credit is INR ${available.toStringAsFixed(2)}; order total is INR ${orderTotal.toStringAsFixed(2)}.',
          );
        }
      }
      final CheckoutResult result =
          await ref.read(cartProvider.notifier).checkout(
                addressId: address.id,
                paymentMode: paymentMode,
                couponCode: couponCode,
                buyNowItem: widget.buyNowItem,
              );
      if (!mounted) return;
      if (paymentMode == 'RAZORPAY') {
        final cartNotifier = ref.read(cartProvider.notifier);
        final ordersNotifier = ref.read(ordersProvider.notifier);
        bool movedToOrders = false;
        Future<void>? initialOrdersRefresh;

        void goToOrdersImmediately() {
          if (movedToOrders || !mounted) return;
          movedToOrders = true;
          _finishCheckoutOnTab(2);
          initialOrdersRefresh = Future.wait<void>(<Future<void>>[
            cartNotifier.syncAfterCheckout(),
            ordersNotifier.load(),
          ]);
        }

        try {
          await RazorpayOrderCheckout.pay(
            dio: ref.read(apiClientProvider),
            orderId: result.orderId,
            merchantName: ref.read(tenantConfigProvider).appName,
            customerName: checkoutProfile?.name ?? '',
            customerPhone: checkoutProfile?.mobile ?? '',
            customerEmail: checkoutProfile?.email ?? '',
            primaryColorValue: Theme.of(context).colorScheme.primary.toARGB32(),
            onPaymentSuccess: goToOrdersImmediately,
          );
          goToOrdersImmediately();

          // The first refresh makes the newly-created order visible as soon as
          // Razorpay closes. Refresh once more after server verification so the
          // Orders page cannot remain stuck with the pre-verification status.
          try {
            await initialOrdersRefresh;
          } catch (_) {
            // The verified refresh below is the authoritative retry.
          }
          await ordersNotifier.load();
        } catch (error) {
          if (movedToOrders) {
            try {
              await initialOrdersRefresh;
            } catch (_) {
              // A final refresh below lets webhook/server reconciliation win.
            }
            unawaited(ordersNotifier.load());
            return;
          }
          final RazorpayOrderCheckoutException? razorpayError =
              error is RazorpayOrderCheckoutException ? error : null;
          final bool safeToAbandon = razorpayError == null ||
              razorpayError.cancelled ||
              !razorpayError.paymentMayHaveSucceeded;
          if (safeToAbandon) {
            try {
              await ref
                  .read(cartProvider.notifier)
                  .abandonOnlineCheckout(result.orderId);
            } catch (abandonError) {
              if (!mounted) return;
              showAppFeedback(
                context,
                message:
                    'Payment status needs attention: ${_checkoutError(abandonError)} Open Orders before trying again.',
                type: AppFeedbackType.error,
              );
              await ref.read(ordersProvider.notifier).load();
              if (mounted) {
                _finishCheckoutOnTab(2);
              }
              return;
            }
            if (!mounted) return;
            showAppFeedback(
              context,
              message: razorpayError?.cancelled == true
                  ? 'Online payment was cancelled. Your cart is unchanged.'
                  : '${razorpayError?.message ?? _checkoutError(error)} Your cart is unchanged.',
              type: razorpayError?.cancelled == true
                  ? AppFeedbackType.info
                  : AppFeedbackType.error,
            );
            // Keep the Checkout route open so the customer can choose another
            // payment method or retry. Cancellation must not force Cart open.
            return;
          }
          if (!mounted) return;
          _finishCheckoutOnTab(2);
          unawaited(ordersNotifier.load());
        }
        return;
      }
      final bool needsProof = paymentMode == 'UPI_QR' || paymentMode == 'NEFT';
      if (needsProof) {
        final bool paymentSubmitted = await _submitPaymentForOrder(result);
        if (!mounted) return;
        if (!paymentSubmitted) {
          try {
            await ref
                .read(cartProvider.notifier)
                .abandonPendingPaymentCheckout(result.orderId);
          } catch (abandonError) {
            if (!mounted) return;
            showAppFeedback(
              context,
              message:
                  'Payment status needs attention: ${_checkoutError(abandonError)} Open Orders before trying again.',
              type: AppFeedbackType.error,
            );
            await ref.read(ordersProvider.notifier).load();
            if (mounted) {
              _finishCheckoutOnTab(2);
            }
            return;
          }
          if (!mounted) return;
          showAppFeedback(
            context,
            message: 'Payment was not submitted. Your cart is unchanged.',
            type: AppFeedbackType.info,
          );
          // The proof sheet was dismissed with Back/Cancel. Stay on Checkout;
          // the abandoned pending order has already released its reservation.
          return;
        }
        await Future.wait<void>(<Future<void>>[
          ref.read(cartProvider.notifier).syncAfterCheckout(),
          ref.read(ordersProvider.notifier).load(),
        ]);
        if (!mounted) return;
        showAppFeedback(
          context,
          message: 'Payment submitted for verification.',
          type: AppFeedbackType.success,
        );
        _finishCheckoutOnTab(2);
        return;
      }
      await ref.read(ordersProvider.notifier).load();
      if (!mounted) return;
      showAppFeedback(
        context,
        message: 'Order placed successfully.',
        type: AppFeedbackType.success,
      );
      _finishCheckoutOnTab(2);
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: 'Checkout failed: ${_checkoutError(error)}',
        type: AppFeedbackType.error,
      );
    } finally {
      if (mounted) setState(() => _checkingOut = false);
    }
  }

  Future<bool> _submitPaymentForOrder(CheckoutResult result) async {
    final CheckoutPaymentInstructions? instructions =
        result.paymentInstructions;
    final PaymentSubmission? submitted =
        await showModalBottomSheet<PaymentSubmission>(
      context: context,
      isScrollControlled: true,
      builder: (BuildContext context) => PaymentSubmissionSheet(
        orderId: result.orderId,
        method: result.paymentMode,
        orderNumber: result.orderNumber,
        amount: result.totalAmount,
        upiUri: instructions?.upiUri,
        transactionNote: instructions?.transactionNote,
      ),
    );
    return submitted != null;
  }

  String _checkoutError(Object error) {
    if (error is DioException) {
      return describeDioError(error);
    }
    if (error is StateError) return error.message;
    if (error is FormatException) return error.message;
    return 'Please try again.';
  }

  Future<void> _openSignIn(BuildContext context) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (BuildContext context) {
          final colorScheme = Theme.of(context).colorScheme;
          return Scaffold(
            appBar: AppBar(
              toolbarHeight: 60,
              backgroundColor: colorScheme.primary,
              foregroundColor: colorScheme.onPrimary,
              centerTitle: false,
              leadingWidth: 64,
              leading: Padding(
                padding: const EdgeInsets.only(left: 12),
                child: IconButton(
                  tooltip: 'Back',
                  icon: const Icon(Icons.arrow_back_ios_new, size: 18),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
              title: Text(
                'Account',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: colorScheme.onPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            body: const AuthScreen(),
          );
        },
      ),
    );
  }
}

class _PaymentMethodCard extends ConsumerWidget {
  const _PaymentMethodCard({
    required this.selected,
    required this.utrController,
    required this.total,
    required this.profile,
    required this.onSelected,
    required this.onOpenUpi,
  });

  final String selected;
  final TextEditingController utrController;
  final double total;
  final CustomerProfile? profile;
  final ValueChanged<String> onSelected;
  final VoidCallback onOpenUpi;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final payment = ref.watch(distributorPaymentSettingsProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final ColorScheme colors = Theme.of(context).colorScheme;
    final double? availableCredit = profile == null
        ? null
        : availableCreditAmount(
            creditLimit: profile!.creditLimit,
            outstanding: profile!.creditBalance,
          );
    final bool canUseCredit = profile == null ||
        creditCoversOrder(
          creditLimit: profile!.creditLimit,
          outstanding: profile!.creditBalance,
          orderTotal: total,
        );
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: colors.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: RadioGroup<String>(
          groupValue: selected,
          onChanged: (String? value) {
            if (value != null) onSelected(value);
          },
          child: Column(
            children: <Widget>[
              RadioListTile<String>(
                value: 'RAZORPAY',
                title: Text(t('Online Pay')),
                subtitle:
                    Text(t('Pay securely with UPI, cards or netbanking.')),
                secondary: const Icon(Icons.lock_outline),
              ),
              RadioListTile<String>(
                value: 'UPI_QR',
                title: Text(t('UPI QR')),
                subtitle: Text(t('Scan generated QR and complete payment.')),
                secondary: IconButton(
                  tooltip: t('Open QR'),
                  onPressed: onOpenUpi,
                  icon: const Icon(Icons.qr_code_2_outlined),
                ),
              ),
              RadioListTile<String>(
                value: 'NEFT',
                title: Text(t('NEFT / RTGS / IMPS')),
                subtitle: Text(t('Transfer to distributor bank account.')),
              ),
              if (selected == 'NEFT') ...<Widget>[
                payment.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (Object error, _) => Text('$error'),
                  data: (DistributorPaymentSettings data) => Column(
                    children: <Widget>[
                      _BankRow(
                          label: t('Account number'),
                          value: data.accountNumber),
                      _BankRow(label: t('IFSC'), value: data.ifsc),
                      _BankRow(label: t('Bank'), value: data.bankName),
                      const SizedBox(height: 10),
                      TextField(
                        controller: utrController,
                        textCapitalization: TextCapitalization.characters,
                        decoration: InputDecoration(
                          labelText: t('UTR number'),
                          helperText: t('Payment status: Pending Verification'),
                          border: const OutlineInputBorder(),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              RadioListTile<String>(
                value: 'CASH',
                title: Text(t('Cash')),
                subtitle: Text(t('Pay cash to distributor on delivery.')),
              ),
              RadioListTile<String>(
                value: 'CREDIT',
                enabled: canUseCredit,
                title: Text(t('Credit Terms')),
                subtitle: Text(
                  availableCredit == null
                      ? t('Place order against approved credit limit.')
                      : canUseCredit
                          ? '${t('Available credit')}: ${localization.formatCurrency(availableCredit)}'
                          : '${t('Available credit')}: ${localization.formatCurrency(availableCredit)}. ${t('Order total exceeds available credit.')}',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BankRow extends StatelessWidget {
  const _BankRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      subtitle: SelectableText(value),
      trailing: IconButton(
        tooltip: 'Copy',
        onPressed: value.isEmpty
            ? null
            : () {
                Clipboard.setData(ClipboardData(text: value));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$label copied')),
                );
              },
        icon: const Icon(Icons.copy_outlined),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
          ),
    );
  }
}

class _DeliveryCard extends StatelessWidget {
  const _DeliveryCard({
    required this.address,
    required this.guest,
    required this.t,
    required this.onChange,
  });

  final CustomerAddress? address;
  final bool guest;
  final String Function(String) t;
  final VoidCallback onChange;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    final String addressText = address?.formatted ??
        (guest
            ? t('Sign in to choose a delivery address.')
            : t('No saved delivery address.'));
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: colors.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Container(
              width: 42,
              height: 42,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: colors.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.location_on,
                color: colors.onPrimaryContainer,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    address?.title ?? t('Delivery address'),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colors.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    addressText,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          height: 1.35,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: onChange,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(guest ? t('Sign in') : t('Change')),
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckoutOrderSummaryCard extends StatelessWidget {
  const _CheckoutOrderSummaryCard({
    required this.items,
    required this.t,
    required this.formatCurrency,
  });

  final List<CartItem> items;
  final String Function(String) t;
  final String Function(num) formatCurrency;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: colors.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: <Widget>[
            for (int index = 0; index < items.length; index++) ...<Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          t(items[index].name),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '${t('Quantity')}: ${items[index].quantity}',
                          style: TextStyle(color: colors.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Text(
                    formatCurrency(items[index].lineTotal),
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ],
              ),
              if (index != items.length - 1)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(height: 1),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CartItemCard extends StatelessWidget {
  const _CartItemCard({
    required this.item,
    required this.imageUrl,
    required this.t,
    required this.formatCurrency,
    required this.onDecrease,
    required this.onIncrease,
    required this.onRemove,
  });

  final CartItem item;
  final String? imageUrl;
  final String Function(String) t;
  final String Function(num) formatCurrency;
  final VoidCallback? onDecrease;
  final VoidCallback? onIncrease;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: colors.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            _CartProductImage(url: imageUrl),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    t(item.name),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${formatCurrency(item.unitPrice)} ${t('each')}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    formatCurrency(item.lineTotal),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: colors.primary,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: <Widget>[
                      _QuantityStepper(
                        quantity: item.quantity,
                        onDecrease: onDecrease,
                        onIncrease: onIncrease,
                      ),
                      IconButton.outlined(
                        tooltip: t('Remove'),
                        onPressed: onRemove,
                        icon: const Icon(Icons.delete_outline),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartProductImage extends StatelessWidget {
  const _CartProductImage({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    final Widget fallback = ColoredBox(
      color: colors.surfaceContainerHighest,
      child: Icon(Icons.inventory_2_outlined, color: colors.primary),
    );
    final String clean = url?.trim() ?? '';
    Widget image = fallback;
    if (clean.isNotEmpty) {
      final bool svg = clean.toLowerCase().endsWith('.svg');
      if (clean.startsWith('assets/')) {
        image = svg
            ? SvgPicture.asset(clean, fit: BoxFit.contain)
            : Image.asset(
                clean,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => fallback,
              );
      } else {
        image = svg
            ? SvgPicture.network(
                clean,
                fit: BoxFit.contain,
                placeholderBuilder: (_) => fallback,
              )
            : Image.network(
                clean,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => fallback,
              );
      }
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: ColoredBox(
        color: colors.surfaceContainerLow,
        child: SizedBox(width: 104, height: 132, child: image),
      ),
    );
  }
}

class _QuantityStepper extends StatelessWidget {
  const _QuantityStepper({
    required this.quantity,
    required this.onDecrease,
    required this.onIncrease,
  });

  final int quantity;
  final VoidCallback? onDecrease;
  final VoidCallback? onIncrease;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Container(
      width: 122,
      height: 42,
      decoration: BoxDecoration(
        color: colors.primaryContainer.withValues(alpha: 0.55),
        border: Border.all(color: colors.primary.withValues(alpha: 0.35)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: <Widget>[
          _QuantityButton(
            tooltip: 'Decrease quantity',
            icon: Icons.remove,
            onPressed: onDecrease,
          ),
          Expanded(
            child: Text(
              '$quantity',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: colors.onPrimaryContainer,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          _QuantityButton(
            tooltip: 'Increase quantity',
            icon: Icons.add,
            onPressed: onIncrease,
          ),
        ],
      ),
    );
  }
}

class _QuantityButton extends StatelessWidget {
  const _QuantityButton({
    required this.tooltip,
    required this.icon,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints.tightFor(width: 38, height: 40),
      icon: Icon(icon, size: 19),
    );
  }
}

class _PriceDetailsCard extends StatelessWidget {
  const _PriceDetailsCard({
    required this.subtotal,
    required this.tax,
    required this.total,
    required this.t,
    required this.formatCurrency,
  });

  final double subtotal;
  final double tax;
  final double total;
  final String Function(String) t;
  final String Function(num) formatCurrency;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: colors.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: <Widget>[
            _PriceRow(
              label: t('Subtotal'),
              value: formatCurrency(subtotal),
            ),
            const SizedBox(height: 12),
            _PriceRow(label: t('Tax'), value: formatCurrency(tax)),
            const SizedBox(height: 12),
            _PriceRow(
              label: t('Delivery Charges'),
              value: t('FREE'),
              valueColor: colors.primary,
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Divider(height: 1),
            ),
            _PriceRow(
              label: t('Total'),
              value: formatCurrency(total),
              emphasize: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({
    required this.label,
    required this.value,
    this.valueColor,
    this.emphasize = false,
  });

  final String label;
  final String value;
  final Color? valueColor;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final TextStyle? style = (emphasize
            ? Theme.of(context).textTheme.titleMedium
            : Theme.of(context).textTheme.bodyLarge)
        ?.copyWith(
      color: valueColor,
      fontWeight: emphasize ? FontWeight.w800 : FontWeight.w600,
    );
    return Row(
      children: <Widget>[
        Expanded(child: Text(label, style: style)),
        const SizedBox(width: 12),
        Text(value, style: style),
      ],
    );
  }
}

class _GuestCheckoutNotice extends StatelessWidget {
  const _GuestCheckoutNotice({required this.t});

  final String Function(String) t;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.secondaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: <Widget>[
          Icon(Icons.lock_outline, color: colors.onSecondaryContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              t('Sign in before checkout to link this device cart to your account.'),
              style: TextStyle(color: colors.onSecondaryContainer),
            ),
          ),
        ],
      ),
    );
  }
}

class _CheckoutBar extends StatelessWidget {
  const _CheckoutBar({
    required this.label,
    required this.totalLabel,
    required this.loading,
    required this.onPressed,
  });

  final String label;
  final String totalLabel;
  final bool loading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Material(
      color: colors.surface,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: colors.outlineVariant)),
        ),
        child: SizedBox(
          width: double.infinity,
          height: 52,
          child: FilledButton(
            onPressed: loading ? null : onPressed,
            style: FilledButton.styleFrom(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: loading
                ? const SizedBox.square(
                    dimension: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  )
                : Text(
                    '$label  $totalLabel',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

class _EmptyCart extends StatelessWidget {
  const _EmptyCart({
    required this.guest,
    required this.t,
    required this.onBrowse,
  });

  final bool guest;
  final String Function(String) t;
  final VoidCallback onBrowse;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 76,
              height: 76,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: colors.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.shopping_cart_outlined,
                size: 38,
                color: colors.onPrimaryContainer,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              t('Your cart is empty'),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              guest
                  ? t('Browse products and add items to this guest cart.')
                  : t('Browse products and add items to your cart.'),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: onBrowse,
              icon: const Icon(Icons.storefront_outlined),
              label: Text(t('Browse products')),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartError extends StatelessWidget {
  const _CartError({
    required this.message,
    required this.retryLabel,
    required this.onRetry,
  });

  final String message;
  final String retryLabel;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.error_outline, size: 42),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 14),
            FilledButton(onPressed: onRetry, child: Text(retryLabel)),
          ],
        ),
      ),
    );
  }
}

class _CartPreferenceMessage extends StatelessWidget {
  const _CartPreferenceMessage({required this.onOpenSettings});

  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.shopping_cart_outlined, size: 44),
            const SizedBox(height: 12),
            const Text(
              'Guest cart is turned off in your preferences.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: onOpenSettings,
              icon: const Icon(Icons.settings_outlined),
              label: const Text('Open settings'),
            ),
          ],
        ),
      ),
    );
  }
}
