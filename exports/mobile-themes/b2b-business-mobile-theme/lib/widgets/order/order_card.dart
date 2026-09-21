import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/mock_models.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_asset_image.dart';
import 'order_status_chip.dart';

class OrderCard extends StatelessWidget {
  const OrderCard({
    super.key,
    required this.order,
    this.onViewDetails,
    this.onReorder,
  });

  final OrderSummary order;
  final VoidCallback? onViewDetails;
  final VoidCallback? onReorder;

  @override
  Widget build(BuildContext context) {
    return Card(
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
                      Text('Order #${order.id}', style: Theme.of(context).textTheme.titleMedium),
                      Text(DateFormat('dd MMM yyyy').format(order.date)),
                    ],
                  ),
                ),
                OrderStatusChip(status: order.status),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: <Widget>[
                SizedBox(
                  width: 92,
                  height: 34,
                  child: Stack(
                    children: order.items.take(3).toList().asMap().entries.map((entry) {
                      return Positioned(
                        left: entry.key * 26,
                        child: CircleAvatar(
                          radius: 17,
                          backgroundColor: AppColors.primaryLight,
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: AppAssetImage(asset: entry.value.product.asset),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                Expanded(
                  child: Text('${order.itemCount} Items'),
                ),
                Text(
                  'Rs ${order.total.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: <Widget>[
                Expanded(
                  child: OutlinedButton(
                    onPressed: onViewDetails,
                    child: const Text('View Details'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.tonal(
                    onPressed: onReorder,
                    child: const Text('Reorder'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
