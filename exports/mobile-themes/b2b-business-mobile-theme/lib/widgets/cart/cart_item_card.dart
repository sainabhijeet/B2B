import 'package:flutter/material.dart';

import '../../models/mock_models.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_asset_image.dart';
import '../../widgets/product/quantity_selector.dart';

class CartItemCard extends StatelessWidget {
  const CartItemCard({super.key, required this.item, this.onDelete});

  final CartItem item;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final product = item.product;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            SizedBox(
              width: 66,
              height: 66,
              child: AppAssetImage(asset: product.asset),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(product.name, style: Theme.of(context).textTheme.titleMedium),
                  Text('${product.packSize} | Rs ${product.price.toStringAsFixed(0)} x ${item.quantity}'),
                  const SizedBox(height: 8),
                  Text(
                    item.unavailable ? 'Item unavailable' : 'In stock',
                    style: TextStyle(
                      color: item.unavailable ? AppColors.error : AppColors.success,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: <Widget>[
                IconButton(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline_rounded),
                ),
                QuantitySelector(quantity: item.quantity, onMinus: () {}, onPlus: () {}),
                const SizedBox(height: 8),
                Text(
                  'Rs ${item.total.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
