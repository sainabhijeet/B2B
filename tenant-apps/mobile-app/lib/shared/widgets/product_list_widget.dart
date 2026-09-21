import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/language_provider.dart';
import '../models/catalog_product.dart';
import 'product_card_widget.dart';

/// How each row is rendered (keeps layout files thin).
enum ProductListRowStyle {
  /// Name + price rows (list / catalog).
  simpleTile,

  /// Full card + optional qty + add (B2B fast order).
  cardWithActions,
}

/// Vertical list of products — reusable; not tied to a single layout file.
class ProductListWidget extends ConsumerWidget {
  const ProductListWidget({
    super.key,
    required this.products,
    this.style = ProductListRowStyle.simpleTile,
    this.shrinkWrap = false,
    this.listPadding,
    this.listTilePadding,
    this.cardBorderRadius = 12,
    this.cardPadding,
    this.showQtyInCard = true,
    this.qtyForIndex,
    this.onQtyChanged,
    this.onAdd,
    this.fallbackImageUrl,
  });

  final List<CatalogProduct> products;
  final ProductListRowStyle style;
  final bool shrinkWrap;
  final EdgeInsetsGeometry? listPadding;
  final EdgeInsetsGeometry? listTilePadding;
  final double cardBorderRadius;
  final EdgeInsetsGeometry? cardPadding;
  final bool showQtyInCard;
  final int Function(int index)? qtyForIndex;
  final void Function(int index, int qty)? onQtyChanged;
  final void Function(CatalogProduct p, int index)? onAdd;
  final String? fallbackImageUrl;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    return ListView.separated(
      padding: listPadding ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shrinkWrap: shrinkWrap,
      physics: shrinkWrap ? const NeverScrollableScrollPhysics() : null,
      itemCount: products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (BuildContext context, int i) {
        final CatalogProduct p = products[i];
        switch (style) {
          case ProductListRowStyle.cardWithActions:
            final int q = qtyForIndex?.call(i) ?? 0;
            return ProductCardWidget(
              product: p,
              compact: false,
              cardBorderRadius: cardBorderRadius,
              contentPadding: cardPadding,
              showQty: showQtyInCard,
              qty: q,
              onQtyChanged: showQtyInCard && onQtyChanged != null
                  ? (int v) => onQtyChanged!(i, v)
                  : null,
              showAddButton: onAdd != null,
              onAdd: onAdd == null ? null : () => onAdd!(p, i),
              fallbackImageUrl: fallbackImageUrl,
            );
          case ProductListRowStyle.simpleTile:
            final String imageUrl = p.imageUrl?.trim().isNotEmpty == true
                ? p.imageUrl!.trim()
                : (fallbackImageUrl ?? '').trim();
            return ListTile(
              contentPadding:
                  listTilePadding ?? const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
              leading: _ListImage(imageUrl: imageUrl),
              title: Text(t(p.name), maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: Text(
                p.priceLabel,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
              ),
            );
        }
      },
    );
  }
}

class _ListImage extends StatelessWidget {
  const _ListImage({required this.imageUrl});

  final String imageUrl;

  @override
  Widget build(BuildContext context) {
    final ColorScheme cs = Theme.of(context).colorScheme;
    if (imageUrl.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(
          imageUrl,
          width: 44,
          height: 44,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _placeholder(cs),
        ),
      );
    }
    return _placeholder(cs);
  }

  Widget _placeholder(ColorScheme cs) {
    return CircleAvatar(
      backgroundColor: cs.surfaceContainerHighest,
      child: Icon(Icons.shopping_bag_outlined, color: cs.primary),
    );
  }
}
