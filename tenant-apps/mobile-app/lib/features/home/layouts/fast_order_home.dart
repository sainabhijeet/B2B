import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme_model.dart';
import '../../../core/localization/language_provider.dart';
import '../../../features/products/products_provider.dart';
import '../../../shared/models/catalog_product.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/banner_widget.dart';
import '../../../shared/widgets/app_feedback.dart';
import '../../../shared/widgets/product_list_widget.dart';

/// Base layout 3: B2B fast ordering with optional quantity controls.
class FastOrderHome extends ConsumerStatefulWidget {
  const FastOrderHome({super.key, required this.theme});

  final StorefrontTheme theme;

  @override
  ConsumerState<FastOrderHome> createState() => _FastOrderHomeState();
}

class _FastOrderHomeState extends ConsumerState<FastOrderHome> {
  List<int> _qty = <int>[];

  @override
  Widget build(BuildContext context) {
    final StorefrontTheme t = widget.theme;
    final tr = ref.watch(appTranslatorProvider);
    final productsAsync = ref.watch(productsProvider);

    return productsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (Object error, StackTrace _) => _MessageState(
        title: tr('Could not load products'),
        message: '$error',
      ),
      data: (List<Product> products) {
        final catalogProducts = products.map(_toCatalogProduct).toList();
        if (_qty.length != catalogProducts.length) {
          _qty = List<int>.filled(catalogProducts.length, 0);
        }

        if (catalogProducts.isEmpty) {
          return _MessageState(
            title: tr('No products yet'),
            message: tr('Add products in the distributor panel to show them here.'),
          );
        }

        return ListView(
          children: <Widget>[
            if (t.showBanner)
              BannerWidget(
                title: tr('Featured products'),
                subtitle: tr('Latest catalog from your store'),
                imageUrl: t.bannerImage,
              ),
            ProductListWidget(
              products: catalogProducts,
              style: ProductListRowStyle.cardWithActions,
              shrinkWrap: true,
              listPadding: t.listSectionPadding,
              cardBorderRadius: t.cardBorderRadius,
              cardPadding: t.cardPadding,
              showQtyInCard: t.enableQuickQty,
              qtyForIndex: (int i) => _qty[i],
              onQtyChanged: (int i, int v) => setState(() => _qty[i] = v),
              fallbackImageUrl: t.categoryImage,
              onAdd: (CatalogProduct p, int i) {
                showAppFeedback(
                  context,
                  message: '${tr(p.name)} added to cart. Qty: ${_qty[i]}',
                  type: AppFeedbackType.success,
                );
              },
            ),
          ],
        );
      },
    );
  }
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
    return Center(
      child: Padding(
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
      ),
    );
  }
}
