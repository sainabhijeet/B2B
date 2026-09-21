import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/api/api_client.dart';
import '../../core/config/storefront_app_config_provider.dart';
import '../../core/localization/language_provider.dart';
import '../../core/navigation/app_navigation.dart';
import '../../shared/models/models.dart';
import '../../shared/widgets/app_feedback.dart';
import '../b2b/b2b_providers.dart';
import '../cart/cart_provider.dart';
import '../checkout/checkout_screen.dart';
import 'products_provider.dart';
import 'stock_alert_provider.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.product});

  final Product product;

  @override
  ConsumerState<ProductDetailScreen> createState() =>
      _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  bool _isAdding = false;
  bool _isBuying = false;
  bool _isUpdatingStockAlert = false;
  String? _selectedVariantId;
  int _quantity = 1;

  Product get _currentProduct =>
      ref.read(productDetailProvider(widget.product)).valueOrNull ??
      widget.product;

  ProductVariant? get _selectedVariant {
    final Product product = _currentProduct;
    for (final ProductVariant variant in product.variants) {
      if (variant.id == _selectedVariantId) return variant;
    }
    return product.defaultVariant;
  }

  int get _effectiveMoq => _selectedVariant?.moq ?? _currentProduct.moq;

  int? get _effectiveStock =>
      _selectedVariant?.stockQuantity ?? _currentProduct.stockQuantity;

  String? get _effectiveVariantId => _selectedVariant?.id;

  @override
  void initState() {
    super.initState();
    _selectedVariantId = widget.product.defaultVariant?.id;
    _quantity = widget.product.defaultVariant?.moq ?? widget.product.moq;
  }

  Future<bool> _addToCart({
    bool showSuccessMessage = true,
    bool showLoading = true,
  }) async {
    if (_isAdding) return false;
    if (showLoading) setState(() => _isAdding = true);
    final t = ref.read(appTranslatorProvider);
    final String? authToken = ref.read(authTokenProvider);
    final bool allowGuestCart =
        ref.read(storefrontAppConfigProvider).asData?.value.allowGuestCart ??
            false;
    final bool isGuest = authToken == null || authToken.isEmpty;
    final Product product = _currentProduct;
    if (isGuest && !allowGuestCart) {
      showAppFeedback(
        context,
        message: t('Please sign in to add this product to cart.'),
        type: AppFeedbackType.info,
      );
      if (mounted && showLoading) setState(() => _isAdding = false);
      return false;
    }

    try {
      await ref.read(cartProvider.notifier).addProduct(
            product.id,
            quantity: _quantity,
            variantId: _effectiveVariantId,
            fallbackProduct: product,
          );
      if (!mounted) return false;
      if (showSuccessMessage) {
        showAppFeedback(
          context,
          message: t('Product added to cart successfully.'),
          type: AppFeedbackType.success,
        );
      }
      return true;
    } catch (error) {
      if (!mounted) return false;
      showAppFeedback(
        context,
        message: '${t('Could not add product to cart.')}: $error',
        type: AppFeedbackType.error,
      );
      return false;
    } finally {
      if (mounted && showLoading) setState(() => _isAdding = false);
    }
  }

  Future<void> _buyNow() async {
    if (_isAdding || _isBuying) return;
    setState(() => _isBuying = true);
    try {
      final Product product = _currentProduct;
      final ProductVariant? variant = _selectedVariant;
      final double? unitPrice = product.unitPriceForQuantity(
        _quantity,
        variantId: _effectiveVariantId,
      );
      if (unitPrice == null) {
        throw StateError('Product price is not available. Please sign in.');
      }
      final CartItem buyNowItem = CartItem(
        productId: product.id,
        name: product.name,
        quantity: _quantity,
        unitPrice: unitPrice,
        variantId: variant?.id,
        variantName: variant?.name,
        imageUrl: product.imageUrl,
        taxRate: product.gstRate,
        moq: _effectiveMoq,
        stockQuantity: _effectiveStock,
        priceSlabs: product.slabsForVariant(_effectiveVariantId),
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => CheckoutScreen(buyNowItem: buyNowItem),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: error.toString().replaceFirst('Bad state: ', ''),
        type: AppFeedbackType.error,
      );
    } finally {
      if (mounted) setState(() => _isBuying = false);
    }
  }

  void _goToCart() {
    ref.read(selectedTabProvider.notifier).state = 1;
    Navigator.of(context).pop();
  }

  Future<void> _requestQuote() async {
    final t = ref.read(appTranslatorProvider);
    final TextEditingController target = TextEditingController();
    final TextEditingController message = TextEditingController();
    final bool? submit = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (BuildContext context) {
        return Padding(
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
              Text(
                t('Request for quote'),
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 12),
              Text('${_currentProduct.name} | Qty $_quantity'),
              const SizedBox(height: 12),
              TextField(
                controller: target,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: t('Target unit price'),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: message,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: t('Message'),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: () => Navigator.of(context).pop(true),
                icon: const Icon(Icons.request_quote_outlined),
                label: Text(t('Submit RFQ')),
              ),
            ],
          ),
        );
      },
    );
    if (submit != true) return;
    try {
      await ref.read(rfqServiceProvider).create(
            product: _currentProduct,
            quantity: _quantity,
            targetPrice: double.tryParse(target.text),
            message: message.text,
          );
      if (!mounted) return;
      showAppFeedback(
        context,
        message: t('RFQ submitted successfully.'),
        type: AppFeedbackType.success,
      );
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: '${t('Could not submit RFQ')}: $error',
        type: AppFeedbackType.error,
      );
    } finally {
      target.dispose();
      message.dispose();
    }
  }

  Future<void> _toggleStockAlert(
    StockAlertSubscription? activeAlert,
  ) async {
    if (_isUpdatingStockAlert) return;
    final t = ref.read(appTranslatorProvider);
    final String? authToken = ref.read(authTokenProvider);
    if (authToken == null || authToken.isEmpty) {
      showAppFeedback(
        context,
        message: t('Please sign in to request a stock notification.'),
        type: AppFeedbackType.info,
      );
      return;
    }

    setState(() => _isUpdatingStockAlert = true);
    try {
      if (activeAlert == null) {
        await ref.read(stockAlertServiceProvider).subscribe(
              productId: _currentProduct.id,
              variantId: _effectiveVariantId,
            );
      } else {
        await ref.read(stockAlertServiceProvider).cancel(activeAlert.id);
      }
      ref.invalidate(stockAlertsProvider);
      await ref.read(stockAlertsProvider.future);
      if (!mounted) return;
      showAppFeedback(
        context,
        message: activeAlert == null
            ? t('We will notify you when this product is available.')
            : t('Stock notification cancelled.'),
        type: AppFeedbackType.success,
      );
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: '${t('Could not update stock notification')}: $error',
        type: AppFeedbackType.error,
      );
    } finally {
      if (mounted) setState(() => _isUpdatingStockAlert = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final Product product =
        ref.watch(productDetailProvider(widget.product)).valueOrNull ??
            widget.product;
    final AsyncValue<Product> productDetail =
        ref.watch(productDetailProvider(widget.product));
    final cartItems = ref.watch(cartProvider).valueOrNull ?? const <CartItem>[];
    final bool isInCart = cartItems.any(
      (CartItem item) => item.productId == product.id,
    );
    final ColorScheme cs = Theme.of(context).colorScheme;
    final double? activePrice = product.unitPriceForQuantity(
      _quantity,
      variantId: _effectiveVariantId,
    );
    final String price = activePrice != null
        ? localization.formatCurrency(activePrice)
        : t('Price on request');
    final int? stock = _effectiveStock;
    final bool unavailable = stock != null && stock < _effectiveMoq;
    final List<StockAlertSubscription> stockAlerts =
        ref.watch(stockAlertsProvider).valueOrNull ??
            const <StockAlertSubscription>[];
    StockAlertSubscription? activeStockAlert;
    for (final StockAlertSubscription alert in stockAlerts) {
      if (alert.productId == product.id &&
          alert.variantId == _effectiveVariantId) {
        activeStockAlert = alert;
        break;
      }
    }
    final List<PriceSlab> slabs = product.slabsForVariant(_effectiveVariantId);
    final ButtonStyle bottomButtonStyle = FilledButton.styleFrom(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
    );

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 60,
        backgroundColor: cs.primary,
        foregroundColor: cs.onPrimary,
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
          t(product.name),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: cs.onPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: <Widget>[
          productDetail.maybeWhen(
            loading: () => const LinearProgressIndicator(),
            error: (Object error, _) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                '${t('Could not refresh product details')}: $error',
                style: TextStyle(color: cs.error),
              ),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: _DetailImage(url: product.imageUrl ?? ''),
          ),
          const SizedBox(height: 18),
          Text(
            t(product.name),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            price,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: cs.primary,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              Chip(
                avatar: const Icon(Icons.inventory_2_outlined, size: 18),
                label: Text('${t('MOQ')}: $_effectiveMoq'),
              ),
              Chip(
                avatar: const Icon(Icons.warehouse_outlined, size: 18),
                label: Text(
                  stock == null
                      ? t('Stock available')
                      : '${stock.clamp(0, 999999)} ${t('available')}',
                ),
              ),
              if (product.gstRate > 0)
                Chip(
                  avatar: const Icon(Icons.receipt_long_outlined, size: 18),
                  label: Text('${t('GST')} ${product.gstRate}%'),
                ),
            ],
          ),
          if (product.variants.isNotEmpty) ...<Widget>[
            const SizedBox(height: 16),
            _VariantSelector(
              variants: product.variants,
              selectedId: _effectiveVariantId,
              onChanged: (String id) {
                final ProductVariant variant = product.variants
                    .firstWhere((ProductVariant v) => v.id == id);
                setState(() {
                  _selectedVariantId = id;
                  _quantity = variant.moq > _quantity ? variant.moq : _quantity;
                });
              },
            ),
          ],
          const SizedBox(height: 16),
          if (!unavailable)
            _QuantitySelector(
              quantity: _quantity,
              moq: _effectiveMoq,
              stock: stock,
              onChanged: (int value) => setState(() => _quantity = value),
            )
          else
            FilledButton.icon(
              onPressed: _isUpdatingStockAlert
                  ? null
                  : () => _toggleStockAlert(activeStockAlert),
              icon: _isUpdatingStockAlert
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      activeStockAlert == null
                          ? Icons.notifications_active_outlined
                          : Icons.notifications_off_outlined,
                    ),
              label: Text(
                t(
                  activeStockAlert == null
                      ? 'Notify me when available'
                      : 'Stock notification requested',
                ),
              ),
            ),
          if (slabs.isNotEmpty) ...<Widget>[
            const SizedBox(height: 16),
            _SlabPricingCard(
              slabs: slabs,
              quantity: _quantity,
              formatCurrency: localization.formatCurrency,
            ),
          ],
          const SizedBox(height: 18),
          _DetailSection(
            title: t('Product details'),
            rows: <_DetailRow>[
              _DetailRow(t('Product ID'), product.id),
              _DetailRow(t('Category'), product.categoryId),
              if (_clean(product.brand).isNotEmpty)
                _DetailRow(t('Brand'), product.brand!),
              if (_clean(product.sku).isNotEmpty)
                _DetailRow(t('SKU'), product.sku!),
              if (_clean(product.packSize).isNotEmpty)
                _DetailRow(t('Pack size'), product.packSize!),
              if (_clean(product.unit).isNotEmpty)
                _DetailRow(t('Unit'), product.unit!),
              _DetailRow(
                t('Availability'),
                stock == null ? t('Available') : '$stock ${t('available')}',
              ),
              _DetailRow(t('Minimum order'), '$_effectiveMoq'),
            ],
          ),
          const SizedBox(height: 14),
          _DescriptionCard(
            title: t('Description'),
            description: _clean(product.description).isNotEmpty
                ? t(product.description!)
                : t(
                    'Complete product information is available from the catalog.',
                  ),
          ),
          const SizedBox(height: 22),
          if (!unavailable)
            Row(
            children: <Widget>[
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: isInCart
                      ? FilledButton.tonalIcon(
                          onPressed: _isAdding || _isBuying ? null : _goToCart,
                          style: bottomButtonStyle,
                          icon: const Icon(Icons.shopping_cart_checkout),
                          label: Text(t('Go to cart')),
                        )
                      : FilledButton.icon(
                          onPressed: _isAdding || _isBuying
                              ? null
                              : () => _addToCart(),
                          style: bottomButtonStyle,
                          icon: _isAdding
                              ? const SizedBox.square(
                                  dimension: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.add_shopping_cart),
                          label: Text(t('Add to cart')),
                        ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: FilledButton.icon(
                    onPressed: _isAdding || _isBuying ? null : _buyNow,
                    style: bottomButtonStyle,
                    icon: _isBuying
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.flash_on_outlined),
                    label: Text(t('Buy Now')),
                  ),
                ),
              ),
            ],
            ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _isAdding || _isBuying ? null : _requestQuote,
            icon: const Icon(Icons.request_quote_outlined),
            label: Text(t('Request for quote')),
          ),
        ],
      ),
    );
  }

  static String _clean(String? value) => value?.trim() ?? '';
}

class _VariantSelector extends StatelessWidget {
  const _VariantSelector({
    required this.variants,
    required this.selectedId,
    required this.onChanged,
  });

  final List<ProductVariant> variants;
  final String? selectedId;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Variants',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: variants.map((ProductVariant variant) {
                return ChoiceChip(
                  selected: variant.id == selectedId,
                  label: Text(variant.name),
                  onSelected: (_) => onChanged(variant.id),
                );
              }).toList(growable: false),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuantitySelector extends StatelessWidget {
  const _QuantitySelector({
    required this.quantity,
    required this.moq,
    required this.stock,
    required this.onChanged,
  });

  final int quantity;
  final int moq;
  final int? stock;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final int max = stock == null || stock! < moq ? 999999 : stock!;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: <Widget>[
            Expanded(
              child: Text(
                'Order quantity',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
            ),
            IconButton.outlined(
              onPressed: quantity <= moq ? null : () => onChanged(quantity - 1),
              icon: const Icon(Icons.remove),
            ),
            SizedBox(
              width: 54,
              child: Text(
                '$quantity',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
            IconButton.outlined(
              onPressed: quantity >= max ? null : () => onChanged(quantity + 1),
              icon: const Icon(Icons.add),
            ),
          ],
        ),
      ),
    );
  }
}

class _SlabPricingCard extends StatelessWidget {
  const _SlabPricingCard({
    required this.slabs,
    required this.quantity,
    required this.formatCurrency,
  });

  final List<PriceSlab> slabs;
  final int quantity;
  final String Function(num value) formatCurrency;

  @override
  Widget build(BuildContext context) {
    final List<PriceSlab> sorted = List<PriceSlab>.of(slabs)
      ..sort((PriceSlab a, PriceSlab b) => a.minQty.compareTo(b.minQty));
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Tier pricing',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            for (final PriceSlab slab in sorted)
              ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  quantity >= slab.minQty
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                ),
                title: Text(slab.label ?? '${slab.minQty}+ units'),
                trailing: Text(
                  formatCurrency(slab.price),
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _DetailImage extends StatelessWidget {
  const _DetailImage({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    final String clean = url.trim();
    final Widget fallback = Container(
      height: 260,
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      alignment: Alignment.center,
      child: Icon(
        Icons.image_outlined,
        size: 56,
        color: Theme.of(context).colorScheme.primary,
      ),
    );
    if (clean.isEmpty) return fallback;
    if (clean.toLowerCase().endsWith('.svg')) {
      return SvgPicture.network(
        clean,
        height: 260,
        fit: BoxFit.contain,
        placeholderBuilder: (_) => fallback,
      );
    }
    if (clean.startsWith('assets/')) {
      return Image.asset(
        clean,
        height: 260,
        width: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback,
      );
    }
    return Image.network(
      clean,
      height: 260,
      width: double.infinity,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback,
    );
  }
}

class _DetailSection extends StatelessWidget {
  const _DetailSection({required this.title, required this.rows});

  final String title;
  final List<_DetailRow> rows;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 10),
            for (final _DetailRow row in rows)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    SizedBox(
                      width: 112,
                      child: Text(
                        row.label,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        row.value,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
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

class _DescriptionCard extends StatelessWidget {
  const _DescriptionCard({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 8),
            Text(description),
          ],
        ),
      ),
    );
  }
}

class _DetailRow {
  const _DetailRow(this.label, this.value);

  final String label;
  final String value;
}
