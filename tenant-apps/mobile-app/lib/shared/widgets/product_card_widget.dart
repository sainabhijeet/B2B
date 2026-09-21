import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/language_provider.dart';
import '../models/catalog_product.dart';
import 'fast_add_to_cart_widget.dart';
import 'qty_stepper_widget.dart';

/// Primary catalog tile — image, name, price; optional qty + add.
/// Visual density from [cardBorderRadius] / [contentPadding] (theme config).
class ProductCardWidget extends ConsumerWidget {
  const ProductCardWidget({
    super.key,
    required this.product,
    this.compact = false,
    this.cardBorderRadius = 12,
    this.contentPadding,
    this.showAddButton = false,
    this.onAdd,
    this.showQty = false,
    this.qty = 0,
    this.onQtyChanged,
    this.fallbackImageUrl,
  });

  final CatalogProduct product;
  final bool compact;
  final double cardBorderRadius;
  final EdgeInsetsGeometry? contentPadding;
  final bool showAddButton;
  final VoidCallback? onAdd;
  final bool showQty;
  final int qty;
  final ValueChanged<int>? onQtyChanged;
  final String? fallbackImageUrl;

  EdgeInsetsGeometry get _padding =>
      contentPadding ?? EdgeInsets.all(compact ? 8 : 12);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final ColorScheme cs = Theme.of(context).colorScheme;
    final double imgRadius = cardBorderRadius > 0 ? (cardBorderRadius > 8 ? 8 : cardBorderRadius) : 0;
    final String imageUrl = product.imageUrl?.trim().isNotEmpty == true
        ? product.imageUrl!.trim()
        : (fallbackImageUrl ?? '').trim();

    Widget imageBox() {
      if (imageUrl.isNotEmpty) {
        return ClipRRect(
          borderRadius: BorderRadius.circular(imgRadius),
          child: Image.network(
            imageUrl,
            width: compact ? 56 : 72,
            height: compact ? 56 : 72,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => imagePlaceholder(cs, compact, imgRadius),
          ),
        );
      }
      return imagePlaceholder(cs, compact, imgRadius);
    }

    return Card(
      elevation: 0,
      color: cs.surfaceContainerHighest,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(cardBorderRadius),
      ),
      child: Padding(
        padding: _padding,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            imageBox(),
            SizedBox(width: compact ? 10 : 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    t(product.name),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    product.priceLabel,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: cs.primary,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  if (showQty && onQtyChanged != null) ...<Widget>[
                    const SizedBox(height: 8),
                    QtyStepperWidget(qty: qty, onChanged: onQtyChanged!),
                  ],
                  if (showAddButton) ...<Widget>[
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: FastAddToCartWidget(
                        onPressed: onAdd,
                        enabled: onAdd != null && (!showQty || qty > 0),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget imagePlaceholder(ColorScheme cs, bool compact, double radius) {
    final double s = compact ? 56 : 72;
    return Container(
      width: s,
      height: s,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(radius),
      ),
      child: Icon(Icons.inventory_2_outlined, color: cs.outline, size: compact ? 28 : 32),
    );
  }
}
