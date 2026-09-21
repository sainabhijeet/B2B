import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/localization/language_provider.dart';
import '../../shared/models/models.dart';
import 'product_detail_screen.dart';
import 'products_provider.dart';

class ProductsScreen extends ConsumerWidget {
  const ProductsScreen({super.key, this.category});

  final Category? category;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productsProvider);
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    return products.when(
      data: (items) {
        final List<Product> visibleItems = category == null
            ? items
            : items
                .where((product) => _matchesCategory(product, category!))
                .toList(growable: false);
        if (visibleItems.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Text(
                    t('No products found'),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    t('Add active products in catalog to show them in the app.'),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  FilledButton.tonal(
                    onPressed: () => ref.invalidate(productsProvider),
                    child: Text(t('Retry')),
                  ),
                ],
              ),
            ),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          itemCount: visibleItems.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (BuildContext context, int i) {
            final Product product = visibleItems[i];
            return _ProductListCard(
              product: product,
              priceLabel: product.price != null
                  ? localization.formatCurrency(product.price!)
                  : t('Price on request'),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => ProductDetailScreen(product: product),
                  ),
                );
              },
            );
          },
        );
      },
      error: (error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text('${t('Failed')}: $error', textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton.tonal(
                onPressed: () => ref.invalidate(productsProvider),
                child: Text(t('Retry')),
              ),
            ],
          ),
        ),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
    );
  }

  bool _matchesCategory(Product product, Category selectedCategory) {
    final productCategory = _normalizeCategoryKey(product.categoryId);
    final categoryKeys = <String>{
      _normalizeCategoryKey(selectedCategory.id),
      _normalizeCategoryKey(selectedCategory.name),
      _normalizeCategoryKey(selectedCategory.slug ?? ''),
    }..removeWhere((key) => key.isEmpty);
    return categoryKeys.contains(productCategory);
  }

  String _normalizeCategoryKey(String value) {
    return value
        .toLowerCase()
        .trim()
        .replaceAll('&', 'and')
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
  }
}

class _ProductListCard extends StatelessWidget {
  const _ProductListCard({
    required this.product,
    required this.priceLabel,
    required this.onTap,
  });

  final Product product;
  final String priceLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final ColorScheme colors = theme.colorScheme;
    final String subtitle = <String>[
      if ((product.brand ?? '').trim().isNotEmpty) product.brand!.trim(),
      if ((product.packSize ?? '').trim().isNotEmpty) product.packSize!.trim(),
    ].join(' | ');
    final String stockLabel = product.stockQuantity == null
        ? 'Available'
        : '${product.stockQuantity} ${product.unit ?? 'units'} available';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Color.alphaBlend(
              colors.primary.withValues(alpha: 0.035),
              colors.surface,
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: colors.outlineVariant.withValues(alpha: 0.65),
            ),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: <Widget>[
              _ProductThumb(url: product.imageUrl),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      product.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: colors.onSurface,
                        fontWeight: FontWeight.w900,
                        height: 1.15,
                      ),
                    ),
                    const SizedBox(height: 5),
                    if (subtitle.isNotEmpty)
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    const SizedBox(height: 8),
                    Text(
                      priceLabel,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: colors.primary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: colors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        stockLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colors.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.chevron_right,
                color: colors.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductThumb extends StatelessWidget {
  const _ProductThumb({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colors = Theme.of(context).colorScheme;
    final String clean = url?.trim() ?? '';
    final Widget fallback = ColoredBox(
      color: colors.surfaceContainerHighest,
      child: Icon(
        Icons.inventory_2_outlined,
        color: colors.primary,
        size: 34,
      ),
    );

    Widget child = fallback;
    if (clean.isNotEmpty) {
      final bool svg = clean.toLowerCase().endsWith('.svg');
      if (clean.startsWith('assets/')) {
        child = svg
            ? SvgPicture.asset(clean, fit: BoxFit.contain)
            : Image.asset(
                clean,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => fallback,
              );
      } else {
        child = svg
            ? SvgPicture.network(
                clean,
                fit: BoxFit.contain,
                placeholderBuilder: (_) => fallback,
              )
            : Image.network(
                clean,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => fallback,
              );
      }
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(
        width: 104,
        height: 112,
        child: DecoratedBox(
          decoration: BoxDecoration(color: colors.surfaceContainerLow),
          child: child,
        ),
      ),
    );
  }
}
