import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/language_provider.dart';
import '../../shared/models/models.dart';
import '../credit/credit_screen.dart';
import '../products/product_detail_screen.dart';
import '../products/products_provider.dart';
import '../settings/settings_detail_screens.dart';
import 'category_catalog_filter.dart';

class CategoryScreen extends ConsumerStatefulWidget {
  const CategoryScreen({super.key});

  @override
  ConsumerState<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends ConsumerState<CategoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  int _selectedIndex = 0;
  String _query = '';
  bool _moqOnly = false;
  bool _gstOnly = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _selectCategory(int index) {
    _searchController.clear();
    setState(() {
      _selectedIndex = index;
      _query = '';
    });
  }

  void _openCredit(String Function(String) t) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (BuildContext context) => SettingsDetailScaffold(
          title: t('Credit'),
          child: const CreditScreen(),
        ),
      ),
    );
  }

  Future<void> _showFilters(String Function(String) t) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setSheetState) {
            void update(VoidCallback change) {
              setState(change);
              setSheetState(() {});
            }

            return SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Text(
                      t('Catalog filters'),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 8),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      title: Text(t('MOQ greater than 1')),
                      secondary: const Icon(Icons.inventory_2_outlined),
                      value: _moqOnly,
                      onChanged: (bool value) => update(() => _moqOnly = value),
                    ),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      title: Text(t('GST applicable')),
                      secondary: const Icon(Icons.receipt_long_outlined),
                      value: _gstOnly,
                      onChanged: (bool value) => update(() => _gstOnly = value),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: !_moqOnly && !_gstOnly
                          ? null
                          : () => update(() {
                                _moqOnly = false;
                                _gstOnly = false;
                              }),
                      icon: const Icon(Icons.filter_alt_off_outlined),
                      label: Text(t('Clear filters')),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoriesProvider);
    final products = ref.watch(categoryCatalogProductsProvider);
    final t = ref.watch(appTranslatorProvider);

    return categories.when(
      data: (items) {
        if (items.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                t('No categories found'),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
            ),
          );
        }

        final int selectedIndex =
            _selectedIndex.clamp(0, items.length - 1).toInt();
        final Category selectedCategory = items[selectedIndex];
        return products.when(
          data: (List<Product> rows) {
            final List<Product> visibleProducts = CategoryCatalogFilter.apply(
              products: rows,
              categories: items,
              selectedCategory: selectedCategory,
              query: _query,
              moqOnly: _moqOnly,
              gstOnly: _gstOnly,
            );
            return _B2BCategoryPage(
              categories: items,
              selectedIndex: selectedIndex,
              selectedCategory: selectedCategory,
              products: visibleProducts,
              searchController: _searchController,
              query: _query,
              moqOnly: _moqOnly,
              gstOnly: _gstOnly,
              onSearchChanged: (String value) {
                setState(() => _query = value);
              },
              onClearSearch: () {
                _searchController.clear();
                setState(() => _query = '');
              },
              onFiltersPressed: () => _showFilters(t),
              onCreditPressed: () => _openCredit(t),
              onMoqPressed: () {
                setState(() => _moqOnly = !_moqOnly);
              },
              onGstPressed: () {
                setState(() => _gstOnly = !_gstOnly);
              },
              onSelected: _selectCategory,
            );
          },
          error: (Object error, _) => _CategoryError(
            message: '${t('Failed')}: $error',
            onRetry: () => ref.invalidate(categoryCatalogProductsProvider),
            retryLabel: t('Retry'),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
        );
      },
      error: (error, _) => _CategoryError(
        message: '${t('Failed')}: $error',
        onRetry: () => ref.invalidate(categoriesProvider),
        retryLabel: t('Retry'),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
    );
  }
}

class _B2BCategoryPage extends ConsumerWidget {
  const _B2BCategoryPage({
    required this.categories,
    required this.selectedIndex,
    required this.selectedCategory,
    required this.products,
    required this.searchController,
    required this.query,
    required this.moqOnly,
    required this.gstOnly,
    required this.onSearchChanged,
    required this.onClearSearch,
    required this.onFiltersPressed,
    required this.onCreditPressed,
    required this.onMoqPressed,
    required this.onGstPressed,
    required this.onSelected,
  });

  final List<Category> categories;
  final int selectedIndex;
  final Category selectedCategory;
  final List<Product> products;
  final TextEditingController searchController;
  final String query;
  final bool moqOnly;
  final bool gstOnly;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onClearSearch;
  final VoidCallback onFiltersPressed;
  final VoidCallback onCreditPressed;
  final VoidCallback onMoqPressed;
  final VoidCallback onGstPressed;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final ColorScheme colors = Theme.of(context).colorScheme;
    final TextTheme textTheme = Theme.of(context).textTheme;

    return CustomScrollView(
      slivers: <Widget>[
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
          sliver: SliverToBoxAdapter(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Color.alphaBlend(
                  colors.primary.withValues(alpha: 0.06),
                  colors.surface,
                ),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: colors.outlineVariant.withValues(alpha: 0.7),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(
                                t('Business catalog'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  height: 1.05,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                t('Registered wholesale categories'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: textTheme.bodySmall?.copyWith(
                                  color: colors.onSurfaceVariant,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        _B2BBadge(label: t('B2B')),
                      ],
                    ),
                    const SizedBox(height: 14),
                    _SearchShell(
                      controller: searchController,
                      hint: t('Search SKUs, brands, categories'),
                      filtersTooltip: t('Catalog filters'),
                      onChanged: onSearchChanged,
                      onClear: onClearSearch,
                      onFiltersPressed: onFiltersPressed,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: _MetricTile(
                            icon: Icons.account_balance_wallet_outlined,
                            label: t('Credit'),
                            onTap: onCreditPressed,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _MetricTile(
                            icon: Icons.inventory_2_outlined,
                            label: t('MOQ'),
                            selected: moqOnly,
                            onTap: onMoqPressed,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _MetricTile(
                            icon: Icons.receipt_long_outlined,
                            label: t('GST'),
                            selected: gstOnly,
                            onTap: onGstPressed,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
          sliver: SliverToBoxAdapter(
            child: SizedBox(
              height: 120,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (BuildContext context, int index) {
                  final Category category = categories[index];
                  return _CategorySelectorCard(
                    category: category,
                    selected: index == selectedIndex,
                    onTap: () => onSelected(index),
                  );
                },
              ),
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
          sliver: SliverToBoxAdapter(
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        query.trim().isEmpty
                            ? t(selectedCategory.name)
                            : t('Search results'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${products.length} ${t('products available')}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                _B2BBadge(
                  label: query.trim().isEmpty
                      ? _badgeFor(selectedCategory.name)
                      : t('B2B'),
                ),
              ],
            ),
          ),
        ),
        if (products.isEmpty)
          SliverFillRemaining(
            hasScrollBody: false,
            child: _EmptyProductsState(message: t('No products found')),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 112),
            sliver: SliverGrid.builder(
              itemCount: products.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.62,
              ),
              itemBuilder: (BuildContext context, int index) {
                final Product product = products[index];
                return _B2BProductCard(product: product);
              },
            ),
          ),
      ],
    );
  }
}

class _B2BBadge extends StatelessWidget {
  const _B2BBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: colors.primaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: colors.onPrimaryContainer,
              fontWeight: FontWeight.w900,
            ),
      ),
    );
  }
}

class _SearchShell extends StatelessWidget {
  const _SearchShell({
    required this.controller,
    required this.hint,
    required this.filtersTooltip,
    required this.onChanged,
    required this.onClear,
    required this.onFiltersPressed,
  });

  final TextEditingController controller;
  final String hint;
  final String filtersTooltip;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;
  final VoidCallback onFiltersPressed;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return SizedBox(
      height: 48,
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        textInputAction: TextInputAction.search,
        autocorrect: false,
        decoration: InputDecoration(
          filled: true,
          fillColor: colors.surface,
          hintText: hint,
          hintStyle: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: colors.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
          prefixIcon: Icon(
            Icons.search,
            color: colors.onSurfaceVariant,
            size: 21,
          ),
          suffixIconConstraints: const BoxConstraints(minWidth: 48),
          suffixIcon: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (controller.text.isNotEmpty)
                IconButton(
                  tooltip:
                      MaterialLocalizations.of(context).deleteButtonTooltip,
                  onPressed: onClear,
                  icon: const Icon(Icons.close, size: 19),
                ),
              IconButton(
                tooltip: filtersTooltip,
                onPressed: onFiltersPressed,
                icon: Icon(Icons.tune, color: colors.primary, size: 20),
              ),
            ],
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: BorderSide(
              color: colors.outlineVariant.withValues(alpha: 0.7),
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: BorderSide(
              color: colors.outlineVariant.withValues(alpha: 0.7),
            ),
          ),
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.selected = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(13),
        child: AnimatedContainer(
          height: 40,
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: selected ? colors.primaryContainer : colors.surface,
            borderRadius: BorderRadius.circular(13),
            border: Border.all(
              color: selected
                  ? colors.primary
                  : colors.outlineVariant.withValues(alpha: 0.45),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Icon(
                selected ? Icons.check : icon,
                color: selected ? colors.onPrimaryContainer : colors.primary,
                size: 16,
              ),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: selected ? colors.onPrimaryContainer : null,
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategorySelectorCard extends StatelessWidget {
  const _CategorySelectorCard({
    required this.category,
    required this.selected,
    required this.onTap,
  });

  final Category category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: AnimatedContainer(
          width: 118,
          duration: const Duration(milliseconds: 170),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: selected
                ? colors.primaryContainer
                : colors.surfaceContainerHighest.withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected
                  ? colors.primary
                  : colors.outlineVariant.withValues(alpha: 0.65),
              width: selected ? 1.4 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 40,
                      height: 40,
                      child: _CategoryProductImage(
                        url: category.imageUrl,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Icon(
                    _iconFor(category.name),
                    color: selected
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant,
                    size: 18,
                  ),
                ],
              ),
              const Spacer(),
              Text(
                category.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: selected
                          ? colors.onPrimaryContainer
                          : colors.onSurface,
                      fontWeight: FontWeight.w900,
                      height: 1.08,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                _badgeFor(category.name),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: colors.primary,
                      fontWeight: FontWeight.w900,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _B2BProductCard extends ConsumerWidget {
  const _B2BProductCard({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final ColorScheme colors = Theme.of(context).colorScheme;
    final String price = product.price != null
        ? localization.formatCurrency(product.price!)
        : t('Price on request');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => ProductDetailScreen(product: product),
            ),
          );
        },
        child: Ink(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
                color: colors.outlineVariant.withValues(alpha: 0.65)),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Stack(
                  children: <Widget>[
                    Positioned.fill(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: _CategoryProductImage(url: product.imageUrl),
                      ),
                    ),
                    Positioned(
                      left: 8,
                      top: 8,
                      child: _SmallBadge(label: t('Wholesale')),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 9),
              Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: colors.onSurface,
                      fontWeight: FontWeight.w900,
                      height: 1.1,
                    ),
              ),
              const SizedBox(height: 6),
              if ((product.sku ?? '').trim().isNotEmpty)
                Text(
                  product.sku!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: colors.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              const SizedBox(height: 4),
              Text(
                'MOQ ${product.moq}  |  GST ${_formatGstRate(product.gstRate)}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: colors.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 5),
              Row(
                children: <Widget>[
                  Expanded(
                    child: Text(
                      price,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: colors.primary,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ),
                  Icon(Icons.add_shopping_cart_outlined,
                      color: colors.primary, size: 19),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SmallBadge extends StatelessWidget {
  const _SmallBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: colors.primary,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colors.onPrimary,
              fontWeight: FontWeight.w900,
            ),
      ),
    );
  }
}

class _EmptyProductsState extends StatelessWidget {
  const _EmptyProductsState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: colors.surfaceContainerHighest.withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ),
        ),
      ),
    );
  }
}

IconData _iconFor(String label) {
  final String value = label.toLowerCase();
  if (value.contains('seal') || value.contains('packaging')) {
    return Icons.inventory_2_outlined;
  }
  if (value.contains('machine') || value.contains('spare')) {
    return Icons.precision_manufacturing_outlined;
  }
  if (value.contains('adhesive')) {
    return Icons.science_outlined;
  }
  if (value.contains('tool')) {
    return Icons.handyman_outlined;
  }
  if (value.contains('beauty') || value.contains('makeup')) {
    return Icons.face_retouching_natural_outlined;
  }
  return Icons.category_outlined;
}

String _badgeFor(String label) {
  final String value = label.toLowerCase();
  if (value.contains('seal') || value.contains('packaging')) {
    return 'MOQ ready';
  }
  if (value.contains('machine') || value.contains('spare')) {
    return 'Bulk quote';
  }
  if (value.contains('adhesive')) {
    return 'Batch ready';
  }
  if (value.contains('tool')) {
    return 'Workshop';
  }
  if (value.contains('beauty') || value.contains('makeup')) {
    return 'Shade sets';
  }
  return 'Wholesale';
}

String _formatGstRate(double rate) {
  final bool wholeNumber = rate == rate.roundToDouble();
  return '${wholeNumber ? rate.toStringAsFixed(0) : rate.toStringAsFixed(2)}%';
}

class _CategoryProductImage extends StatelessWidget {
  const _CategoryProductImage({
    required this.url,
    this.fit = BoxFit.cover,
  });

  final String? url;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    final String clean = url?.trim() ?? '';
    final Widget fallback = ColoredBox(
      color: colors.surfaceContainerHighest,
      child: Icon(Icons.inventory_2_outlined, color: colors.primary),
    );

    if (clean.isEmpty || clean.toLowerCase().endsWith('.svg')) {
      return fallback;
    }
    if (clean.startsWith('assets/')) {
      return Image.asset(
        clean,
        width: double.infinity,
        height: double.infinity,
        fit: fit,
        errorBuilder: (_, __, ___) => fallback,
      );
    }
    return Image.network(
      clean,
      width: double.infinity,
      height: double.infinity,
      fit: fit,
      errorBuilder: (_, __, ___) => fallback,
    );
  }
}

class _CategoryError extends StatelessWidget {
  const _CategoryError({
    required this.message,
    required this.onRetry,
    required this.retryLabel,
  });

  final String message;
  final VoidCallback onRetry;
  final String retryLabel;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton.tonal(
              onPressed: onRetry,
              child: Text(retryLabel),
            ),
          ],
        ),
      ),
    );
  }
}
