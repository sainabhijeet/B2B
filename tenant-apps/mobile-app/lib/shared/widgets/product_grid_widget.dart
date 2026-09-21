import 'package:flutter/material.dart';

import '../../core/layout/responsive_layout.dart';
import '../models/catalog_product.dart';
import 'product_card_widget.dart';

/// Grid of [ProductCardWidget] — props-driven (theme passes radii / padding / quick qty).
class ProductGridWidget extends StatelessWidget {
  const ProductGridWidget({
    super.key,
    required this.products,
    this.crossAxisCount = 2,
    this.cardBorderRadius = 12,
    this.cardPadding,
    this.outerPadding,
    this.compactCards = true,
    this.enableQuickQty = false,
    this.qtyForIndex,
    this.onQtyChanged,
    this.onAdd,
    this.showAddOnCards = false,
    this.fallbackImageUrl,
  });

  final List<CatalogProduct> products;
  final int crossAxisCount;
  final double cardBorderRadius;
  final EdgeInsetsGeometry? cardPadding;
  final EdgeInsetsGeometry? outerPadding;
  final bool compactCards;
  final bool enableQuickQty;
  final int Function(int index)? qtyForIndex;
  final void Function(int index, int qty)? onQtyChanged;
  final void Function(CatalogProduct p)? onAdd;
  final bool showAddOnCards;
  final String? fallbackImageUrl;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: outerPadding ??
          const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) {
          final int columns = ResponsiveLayout.gridColumns(
            constraints.maxWidth,
            minimumItemWidth: 220,
            spacing: 10,
            maximumColumns: crossAxisCount,
          );
          final bool singleColumn = columns == 1;
          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columns,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: singleColumn
                  ? (enableQuickQty || showAddOnCards ? 2 : 3.2)
                  : 0.78,
            ),
            itemCount: products.length,
            itemBuilder: (BuildContext context, int i) {
              final CatalogProduct p = products[i];
              final int q = qtyForIndex?.call(i) ?? 0;
              return ProductCardWidget(
                product: p,
                compact: compactCards,
                cardBorderRadius: cardBorderRadius,
                contentPadding: cardPadding,
                showQty: enableQuickQty,
                qty: q,
                onQtyChanged: enableQuickQty && onQtyChanged != null
                    ? (int v) => onQtyChanged!(i, v)
                    : null,
                showAddButton: showAddOnCards,
                onAdd: onAdd == null ? null : () => onAdd!(p),
                fallbackImageUrl: fallbackImageUrl,
              );
            },
          );
        },
      ),
    );
  }
}
