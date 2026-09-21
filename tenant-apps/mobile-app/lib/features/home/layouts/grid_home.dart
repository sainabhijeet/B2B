import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme_model.dart';
import '../../../core/localization/language_provider.dart';
import '../../../features/products/products_provider.dart';
import '../../../shared/models/catalog_product.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/banner_widget.dart';
import '../../../shared/widgets/category_widget.dart';
import '../../../shared/widgets/product_grid_widget.dart';

/// Base layout 1: banner, categories, product grid.
class GridHome extends ConsumerStatefulWidget {
  const GridHome({super.key, required this.theme});

  final StorefrontTheme theme;

  @override
  ConsumerState<GridHome> createState() => _GridHomeState();
}

class _GridHomeState extends ConsumerState<GridHome> {
  String _selected = 'All';
  List<int> _qty = <int>[];

  @override
  Widget build(BuildContext context) {
    final StorefrontTheme t = widget.theme;
    final tr = ref.watch(appTranslatorProvider);
    final productsAsync = ref.watch(productsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);

    return productsAsync.when(
      loading: () => _refreshableState(
        const Center(child: CircularProgressIndicator()),
      ),
      error: (Object error, StackTrace _) => _refreshableState(
        _MessageState(
          title: tr('Could not load products'),
          message: '$error',
        ),
      ),
      data: (List<Product> products) {
        final catalogProducts = products.map(_toCatalogProduct).toList();
        if (_qty.length != catalogProducts.length) {
          _qty = List<int>.filled(catalogProducts.length, 0);
        }

        final categoryLabels = categoriesAsync.maybeWhen(
          data: (List<Category> rows) => <String>[
            'All',
            ...rows
                .map((Category c) => c.name)
                .where((String name) => name.trim().isNotEmpty),
          ],
          orElse: () => const <String>['All'],
        );
        if (!categoryLabels.contains(_selected)) _selected = 'All';

        return ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: <Widget>[
            if (t.showBanner)
              BannerWidget(
                title: tr('Featured products'),
                subtitle: tr('Latest catalog from your store'),
                imageUrl: t.bannerImage,
              ),
            const SizedBox(height: 8),
            CategoryWidget(
              labels: categoryLabels,
              selected: _selected,
              onSelected: (String v) => setState(() => _selected = v),
            ),
            const SizedBox(height: 8),
            if (catalogProducts.isEmpty)
              _MessageState(
                title: tr('No products yet'),
                message: tr(
                    'Add products in the distributor panel to show them here.'),
              )
            else
              ProductGridWidget(
                products: catalogProducts,
                cardBorderRadius: t.cardBorderRadius,
                cardPadding: t.cardPadding,
                outerPadding: t.spacingIsCompact
                    ? const EdgeInsets.symmetric(horizontal: 8, vertical: 6)
                    : const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                compactCards: t.spacingIsCompact,
                enableQuickQty: t.enableQuickQty,
                qtyForIndex: t.enableQuickQty ? (int i) => _qty[i] : null,
                onQtyChanged: t.enableQuickQty
                    ? (int i, int v) => setState(() => _qty[i] = v)
                    : null,
                fallbackImageUrl: t.categoryImage,
              ),
            const SizedBox(height: 24),
          ],
        );
      },
    );
  }
}

Widget _refreshableState(Widget child) {
  return LayoutBuilder(
    builder: (BuildContext context, BoxConstraints constraints) => ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: <Widget>[
        SizedBox(height: constraints.maxHeight, child: child),
      ],
    ),
  );
}

CatalogProduct _toCatalogProduct(Product p) {
  final priceLabel = p.price == null ? '' : '₹${p.price!.toStringAsFixed(0)}';
  return CatalogProduct(
    id: p.id,
    name: p.name,
    priceLabel: priceLabel,
    imageUrl: p.imageUrl,
  );
}

class _MessageState extends StatelessWidget {
  const _MessageState({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
