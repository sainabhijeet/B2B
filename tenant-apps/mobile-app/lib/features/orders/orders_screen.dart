import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/dio_errors.dart';
import '../../core/localization/language_provider.dart';
import '../../core/config/user_app_settings_provider.dart';
import '../../core/navigation/app_navigation.dart';
import '../../shared/models/models.dart';
import '../../shared/widgets/app_feedback.dart';
import '../b2b/b2b_providers.dart';
import '../b2b/b2b_screens.dart';
import '../cart/cart_provider.dart';
import '../payments/razorpay_order_checkout.dart';
import '../products/products_provider.dart';
import '../settings/customer_profile_provider.dart';
import 'orders_provider.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  String? _reorderingId;

  Future<void> _refreshOrders() =>
      ref.read(ordersProvider.notifier).load(showLoading: false);

  Future<void> _orderAgain(OrderSummary order) async {
    if (_reorderingId != null) return;
    setState(() => _reorderingId = order.id);
    final t = ref.read(appTranslatorProvider);
    try {
      final int count =
          await ref.read(ordersProvider.notifier).addOrderToCart(order);
      if (!mounted) return;
      if (count == 0) {
        showAppFeedback(
          context,
          message: t('No products found for this order.'),
          type: AppFeedbackType.info,
        );
        return;
      }
      showAppFeedback(
        context,
        message: t('Order items added to cart successfully.'),
        type: AppFeedbackType.success,
      );
      ref.read(selectedTabProvider.notifier).state = 1;
    } catch (_) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: t('Could not repeat this order.'),
        type: AppFeedbackType.error,
      );
    } finally {
      if (mounted) setState(() => _reorderingId = null);
    }
  }

  void _openOrderDetails(OrderSummary order) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => OrderDetailsScreen(order: order),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final UserAppSettings settings = ref.watch(userAppSettingsProvider);
    final ColorScheme colors = Theme.of(context).colorScheme;

    if (!settings.ordersEnabled) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Orders are turned off in Shopping preferences.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    final asyncOrders = ref.watch(ordersProvider);
    return asyncOrders.when(
      data: (orders) {
        if (orders.isEmpty) {
          return RefreshIndicator(
            onRefresh: _refreshOrders,
            child: LayoutBuilder(
              builder: (BuildContext context, BoxConstraints constraints) =>
                  ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: <Widget>[
                  SizedBox(
                    height: constraints.maxHeight,
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            Text(
                              t('No orders yet.'),
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w800),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              t('Place an order from products or home to see it here.'),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: () => ref
                                  .read(selectedTabProvider.notifier)
                                  .state = 0,
                              child: Text(t('Go to home')),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: _refreshOrders,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(12),
            children: orders
                .map(
                (o) => Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => _openOrderDetails(o),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: <Widget>[
                                    Text(
                                      '${t('Order')} ${o.id}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      localization.formatDateTime(o.createdAt),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: <Widget>[
                                  Text(
                                    localization.formatCurrency(o.total),
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w800),
                                  ),
                                  const SizedBox(height: 4),
                                  Icon(
                                    Icons.chevron_right,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: <Widget>[
                              Chip(
                                label: Text(t(o.status)),
                                visualDensity: VisualDensity.compact,
                              ),
                              const Spacer(),
                              if (settings.repeatOrdersEnabled)
                                OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    minimumSize: const Size(132, 40),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 10,
                                    ),
                                    foregroundColor: colors.primary,
                                    backgroundColor: colors.primaryContainer
                                        .withValues(alpha: 0.42),
                                    side: BorderSide(
                                      color: colors.primary.withValues(
                                        alpha: 0.18,
                                      ),
                                    ),
                                    shape: const StadiumBorder(),
                                    textStyle: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  onPressed: _reorderingId == null
                                      ? () => _orderAgain(o)
                                      : null,
                                  icon: _reorderingId == o.id
                                      ? const SizedBox.square(
                                          dimension: 16,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.refresh_rounded,
                                          size: 18,
                                        ),
                                  label: Text(t('Order Again')),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              )
                .toList(),
          ),
        );
      },
      error: (Object error, _) => RefreshIndicator(
        onRefresh: _refreshOrders,
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) =>
              ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: <Widget>[
              SizedBox(
                height: constraints.maxHeight,
                child: Center(
                  child: FilledButton(
                    onPressed: () => ref.read(ordersProvider.notifier).load(),
                    child: Text('${t('Retry')}: $error'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
    );
  }
}

class OrderDetailsScreen extends ConsumerStatefulWidget {
  const OrderDetailsScreen({super.key, required this.order});

  final OrderSummary order;

  @override
  ConsumerState<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends ConsumerState<OrderDetailsScreen> {
  late final Future<List<OrderAgainLine>> _linesFuture;
  bool _submittingRequest = false;
  bool _payingOnline = false;
  bool _onlineVerified = false;
  late String _currentStatus;
  String? _activeRequestStatus;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.order.status.toUpperCase();
    _linesFuture = ref.read(ordersProvider.notifier).orderLines(widget.order);
    unawaited(_loadActiveRequest());
  }

  Future<void> _loadActiveRequest() async {
    if (widget.order.id.startsWith('DEMO-')) return;
    try {
      final status = await ref.read(orderRequestServiceProvider).activeRequestStatus(widget.order.id);
      if (mounted) setState(() => _activeRequestStatus = status);
    } catch (_) {
      // The action remains server-protected if request history is temporarily unavailable.
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final products =
        ref.watch(productsProvider).valueOrNull ?? const <Product>[];
    final ColorScheme colors = Theme.of(context).colorScheme;
    final bool onlineOrder =
        widget.order.paymentMode?.toUpperCase() == 'RAZORPAY';
    final bool onlinePaid = _onlineVerified ||
        widget.order.paymentStatus?.toUpperCase() == 'VERIFIED';
    final bool canPayOnline =
        onlineOrder && !onlinePaid && _currentStatus == 'PENDING';
    final bool canRequestReplacement =
        _activeRequestStatus == null && canRequestOrderReplacement(_currentStatus);
    final bool canCancel =
        _activeRequestStatus == null && canCancelOrder(_currentStatus);

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 60,
        backgroundColor: colors.primary,
        foregroundColor: colors.onPrimary,
        centerTitle: false,
        leadingWidth: 64,
        leading: Padding(
          padding: const EdgeInsets.only(left: 12),
          child: IconButton(
            tooltip: t('Back'),
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        title: Text(
          t('Order details'),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: colors.onPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: <Widget>[
          _OrderSummaryCard(
            order: widget.order,
            status: t(_currentStatus),
            date: localization.formatDateTime(widget.order.createdAt),
            total: localization.formatCurrency(widget.order.total),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const InvoiceCenterScreen(),
                  ),
                ),
                icon: const Icon(Icons.receipt_long_outlined),
                label: Text(t('GST Invoice')),
              ),
              if (canPayOnline)
                FilledButton.icon(
                  onPressed: _payingOnline ? null : _retryOnlinePayment,
                  icon: _payingOnline
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.lock_outline),
                  label: Text(t('Pay Online')),
                )
              else if (onlineOrder)
                OutlinedButton.icon(
                  onPressed: null,
                  icon: Icon(
                    onlinePaid ? Icons.verified_outlined : Icons.block_outlined,
                  ),
                  label: Text(
                    onlinePaid
                        ? t('Payment verified')
                        : t('Payment unavailable'),
                  ),
                )
              else
                OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => DistributorPaymentSettingsScreen(
                        amount: widget.order.total,
                        orderId: widget.order.id,
                      ),
                    ),
                  ),
                  icon: const Icon(Icons.payments_outlined),
                  label: Text(t('Payment')),
                ),
            ],
          ),
          const SizedBox(height: 14),
          _SectionTitle(t('Order items')),
          const SizedBox(height: 10),
          FutureBuilder<List<OrderAgainLine>>(
            future: _linesFuture,
            builder: (BuildContext context,
                AsyncSnapshot<List<OrderAgainLine>> snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (snapshot.hasError) {
                return _InfoCard(text: '${t('Failed')}: ${snapshot.error}');
              }
              final List<OrderAgainLine> rows =
                  snapshot.data ?? const <OrderAgainLine>[];
              if (rows.isEmpty) {
                return _InfoCard(text: t('No products found for this order.'));
              }
              return Column(
                children: rows
                    .map(
                      (OrderAgainLine line) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _OrderLineCard(
                          line: line,
                          product: _productForLine(line, products),
                          currency: localization.formatCurrency,
                        ),
                      ),
                    )
                    .toList(),
              );
            },
          ),
          const SizedBox(height: 8),
          _SectionTitle(t('Price details')),
          const SizedBox(height: 10),
          _PriceDetailsCard(
              total: localization.formatCurrency(widget.order.total)),
          const SizedBox(height: 14),
          _SectionTitle(t('Delivery & payment')),
          const SizedBox(height: 10),
          _InfoCard(
            text:
                '${t('Delivery')}: ${t('Distributor will confirm dispatch and delivery timeline.')}\n'
                '${t('Payment')}: ${onlineOrder ? '${t('Online Pay')} - ${t(onlinePaid ? 'Verified' : 'Pending')}' : t('As per store credit or invoice terms.')}',
          ),
          const SizedBox(height: 14),
          _SectionTitle(t('Order support')),
          const SizedBox(height: 10),
          if (_activeRequestStatus != null) ...<Widget>[
            _InfoCard(text: '${t('Active request')}: ${t(_activeRequestStatus!)}'),
            const SizedBox(height: 10),
          ],
          if (canRequestReplacement || canCancel)
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                if (canRequestReplacement)
                  OutlinedButton.icon(
                    onPressed: _submittingRequest ? null : _openReplacementRequest,
                    icon: const Icon(Icons.assignment_return_outlined),
                    label: Text(t('Return Request')),
                  ),
                if (canCancel)
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(foregroundColor: colors.error),
                    onPressed: _submittingRequest ? null : _openCancelOrder,
                    icon: const Icon(Icons.cancel_outlined),
                    label: Text(t('Cancel Order')),
                  ),
              ],
            )
          else if (_activeRequestStatus == null)
            _InfoCard(text: t('No return or cancellation action is available for this order status.')),
        ],
      ),
    );
  }

  Future<void> _retryOnlinePayment() async {
    if (_payingOnline) return;
    setState(() => _payingOnline = true);
    final CustomerProfile? profile =
        ref.read(customerProfileProvider).valueOrNull;
    try {
      await RazorpayOrderCheckout.pay(
        dio: ref.read(apiClientProvider),
        orderId: widget.order.id,
        merchantName: ref.read(tenantConfigProvider).appName,
        customerName: profile?.name ?? '',
        customerPhone: profile?.mobile ?? '',
        customerEmail: profile?.email ?? '',
        primaryColorValue: Theme.of(context).colorScheme.primary.toARGB32(),
      );
      await Future.wait<void>(<Future<void>>[
        ref.read(cartProvider.notifier).syncAfterCheckout(),
        ref.read(ordersProvider.notifier).load(),
      ]);
      if (!mounted) return;
      setState(() => _onlineVerified = true);
      showAppFeedback(
        context,
        message: 'Payment verified successfully.',
        type: AppFeedbackType.success,
      );
    } catch (error) {
      if (!mounted) return;
      final String message = error is RazorpayOrderCheckoutException
          ? error.message
          : 'Unable to complete Online Pay. Please try again.';
      showAppFeedback(
        context,
        message: message,
        type: AppFeedbackType.error,
      );
    } finally {
      if (mounted) setState(() => _payingOnline = false);
    }
  }

  Future<void> _openReplacementRequest() async {
    final t = ref.read(appTranslatorProvider);
    final description = TextEditingController();
    String reason = 'DAMAGED_PRODUCT';
    List<XFile> photos = <XFile>[];
    String? validationError;
    final bool? submit = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) =>
              SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              20,
              8,
              20,
              MediaQuery.of(context).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text(t('Replacement request'), style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: reason,
                  decoration: InputDecoration(labelText: t('Reason'), border: const OutlineInputBorder()),
                  items: const <MapEntry<String, String>>[
                    MapEntry('DAMAGED_PRODUCT', 'Damaged Product'),
                    MapEntry('DEFECTIVE_PRODUCT', 'Defective Product'),
                    MapEntry('WRONG_ITEM_RECEIVED', 'Wrong Item Received'),
                    MapEntry('MISSING_ITEM', 'Missing Item'),
                    MapEntry('OTHER', 'Other'),
                  ].map((entry) => DropdownMenuItem(value: entry.key, child: Text(t(entry.value)))).toList(),
                  onChanged: (value) => reason = value ?? reason,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: description,
                  maxLines: 4,
                  maxLength: 1000,
                  decoration: InputDecoration(labelText: t('Description'), border: const OutlineInputBorder()),
                ),
                OutlinedButton.icon(
                  onPressed: () async {
                    final picked = await ImagePicker().pickMultiImage(imageQuality: 85);
                    if (picked.isEmpty) return;
                    setModalState(() {
                      photos = picked.take(5).toList(growable: false);
                      validationError = picked.length > 5 ? t('Only the first 5 photos were selected.') : null;
                    });
                  },
                  icon: const Icon(Icons.add_photo_alternate_outlined),
                  label: Text('${t('Upload photos')} (${photos.length}/5)'),
                ),
                if (photos.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(photos.map((photo) => photo.name).join(', '), maxLines: 2, overflow: TextOverflow.ellipsis),
                  ),
                if (validationError != null)
                  Padding(padding: const EdgeInsets.only(top: 8), child: Text(validationError!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: () {
                    final clean = description.text.trim();
                    setModalState(() => validationError = clean.length < 5
                        ? t('Description is required (minimum 5 characters).')
                        : photos.isEmpty
                            ? t('Upload at least one photo.')
                            : null);
                    if (validationError == null) Navigator.of(context).pop(true);
                  },
                  icon: const Icon(Icons.send_outlined),
                  label: Text(t('Submit request')),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (submit != true) {
      description.dispose();
      return;
    }
    setState(() => _submittingRequest = true);
    try {
      await ref.read(orderRequestServiceProvider).createRequest(
            orderId: widget.order.id,
            type: 'REPLACEMENT',
            reason: reason,
            description: description.text,
            photoPaths: photos.map((photo) => photo.path).toList(growable: false),
          );
      if (!mounted) return;
      setState(() => _activeRequestStatus = 'REQUESTED');
      showAppFeedback(
        context,
        message: t('Request submitted successfully.'),
        type: AppFeedbackType.success,
      );
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: '${t('Request failed')}: ${_requestError(error)}',
        type: AppFeedbackType.error,
      );
    } finally {
      description.dispose();
      if (mounted) setState(() => _submittingRequest = false);
    }
  }

  Future<void> _openCancelOrder() async {
    final t = ref.read(appTranslatorProvider);
    final note = TextEditingController();
    String reason = 'ORDERED_BY_MISTAKE';
    final bool? submit = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(t('Cancel Order'), style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: reason,
              decoration: InputDecoration(labelText: t('Cancellation reason'), border: const OutlineInputBorder()),
              items: const <MapEntry<String, String>>[
                MapEntry('ORDERED_BY_MISTAKE', 'Ordered by mistake'),
                MapEntry('WRONG_QUANTITY', 'Wrong quantity'),
                MapEntry('DUPLICATE_ORDER', 'Duplicate order'),
                MapEntry('PRICE_ISSUE', 'Price issue'),
                MapEntry('OTHER', 'Other'),
              ].map((entry) => DropdownMenuItem(value: entry.key, child: Text(t(entry.value)))).toList(),
              onChanged: (value) => reason = value ?? reason,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: note,
              maxLines: 3,
              maxLength: 500,
              decoration: InputDecoration(labelText: t('Optional note'), border: const OutlineInputBorder()),
            ),
            FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
              onPressed: () => Navigator.of(context).pop(true),
              icon: const Icon(Icons.cancel_outlined),
              label: Text(t('Confirm cancellation')),
            ),
          ],
        ),
      ),
    );
    if (submit != true) {
      note.dispose();
      return;
    }
    setState(() => _submittingRequest = true);
    try {
      await ref.read(orderRequestServiceProvider).createRequest(
            orderId: widget.order.id,
            type: 'CANCEL',
            reason: reason,
            note: note.text,
          );
      await ref.read(ordersProvider.notifier).load();
      if (!mounted) return;
      setState(() => _currentStatus = 'CANCELLED');
      showAppFeedback(context, message: t('Order cancelled successfully.'), type: AppFeedbackType.success);
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(context, message: '${t('Cancellation failed')}: ${_requestError(error)}', type: AppFeedbackType.error);
    } finally {
      note.dispose();
      if (mounted) setState(() => _submittingRequest = false);
    }
  }

  String _requestError(Object error) {
    if (error is DioException) return describeDioError(error);
    return '$error';
  }

  Product? _productForLine(OrderAgainLine line, List<Product> products) {
    if (line.fallbackProduct != null) return line.fallbackProduct;
    for (final Product product in products) {
      if (product.id == line.productId) return product;
    }
    return null;
  }
}

class _OrderSummaryCard extends StatelessWidget {
  const _OrderSummaryCard({
    required this.order,
    required this.status,
    required this.date,
    required this.total,
  });

  final OrderSummary order;
  final String status;
  final String date;
  final String total;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    'Order ${order.id}',
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
                Text(
                  total,
                  style: TextStyle(
                    color: colors.primary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(date),
            const SizedBox(height: 12),
            Chip(label: Text(status), visualDensity: VisualDensity.compact),
          ],
        ),
      ),
    );
  }
}

class _OrderLineCard extends StatelessWidget {
  const _OrderLineCard({
    required this.line,
    required this.product,
    required this.currency,
  });

  final OrderAgainLine line;
  final Product? product;
  final String Function(double value) currency;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    final double? unitPrice = product?.price;
    final double? lineTotal =
        unitPrice == null ? null : unitPrice * line.quantity;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: <Widget>[
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: colors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              clipBehavior: Clip.antiAlias,
              child: _OrderProductImage(url: product?.imageUrl),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    product?.name ?? line.productId,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text('Qty: ${line.quantity}'),
                  if (unitPrice != null) ...<Widget>[
                    const SizedBox(height: 4),
                    Text('${currency(unitPrice)} each'),
                  ],
                ],
              ),
            ),
            if (lineTotal != null) ...<Widget>[
              const SizedBox(width: 10),
              Text(
                currency(lineTotal),
                style: TextStyle(
                  color: colors.primary,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _OrderProductImage extends StatelessWidget {
  const _OrderProductImage({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    final String clean = url?.trim() ?? '';
    final Widget fallback =
        Icon(Icons.inventory_2_outlined, color: colors.primary);
    if (clean.isEmpty || clean.toLowerCase().endsWith('.svg')) return fallback;
    if (clean.startsWith('assets/')) {
      return Image.asset(clean,
          fit: BoxFit.cover, errorBuilder: (_, __, ___) => fallback);
    }
    return Image.network(clean,
        fit: BoxFit.cover, errorBuilder: (_, __, ___) => fallback);
  }
}

class _PriceDetailsCard extends StatelessWidget {
  const _PriceDetailsCard({required this.total});

  final String total;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: <Widget>[
            _PriceRow(label: 'Subtotal', value: total),
            const SizedBox(height: 10),
            const _PriceRow(label: 'Delivery charges', value: 'FREE'),
            const Divider(height: 22),
            _PriceRow(label: 'Total', value: total, strong: true),
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
    this.strong = false,
  });

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final TextStyle? style = strong
        ? Theme.of(context)
            .textTheme
            .bodyMedium
            ?.copyWith(fontWeight: FontWeight.w900)
        : Theme.of(context).textTheme.bodyMedium;
    return Row(
      children: <Widget>[
        Expanded(child: Text(label, style: style)),
        Text(value, style: style),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w900,
          ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Text(text),
      ),
    );
  }
}
