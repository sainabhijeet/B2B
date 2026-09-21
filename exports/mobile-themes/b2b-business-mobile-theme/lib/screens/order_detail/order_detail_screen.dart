import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../mock_data/mock_data.dart';
import '../../models/mock_models.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/app_asset_image.dart';
import '../../widgets/order/order_status_chip.dart';

class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({super.key, required this.order});

  final OrderSummary order;

  @override
  Widget build(BuildContext context) {
    final subtotal = order.total - 180;
    return Scaffold(
      appBar: AppBar(title: Text('Order #${order.id}')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: <Widget>[
            Card(
              child: ListTile(
                title: Text('Order #${order.id}', style: Theme.of(context).textTheme.titleLarge),
                subtitle: Text(DateFormat('dd MMM yyyy').format(order.date)),
                trailing: OrderStatusChip(status: order.status),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('Order Timeline', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 12),
                    ...<String>['Order Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered'].map(
                      (label) => _TimelineRow(label: label, done: true),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text('Products', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            ...order.items.map(
              (item) => Card(
                child: ListTile(
                  leading: AppAssetImage(asset: item.product.asset, width: 48, height: 48),
                  title: Text(item.product.name),
                  subtitle: Text('${item.product.packSize} x ${item.quantity}'),
                  trailing: Text('Rs ${(item.product.price * item.quantity).toStringAsFixed(0)}'),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                leading: const Icon(Icons.location_on_outlined),
                title: const Text('Delivery Address'),
                subtitle: Text(MockData.customer.address),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: <Widget>[
                    _Row('Subtotal', subtotal),
                    const _Row('Discount', -45),
                    const _Row('Tax', 80),
                    const _Row('Delivery', 30),
                    const Divider(),
                    _Row('Total', order.total, bold: true),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: <Widget>[
                Expanded(child: FilledButton(onPressed: () {}, child: const Text('Reorder'))),
                const SizedBox(width: 10),
                Expanded(child: OutlinedButton(onPressed: () {}, child: const Text('Invoice'))),
              ],
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.support_agent_rounded),
              label: const Text('Contact Support'),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.label, required this.done});

  final String label;
  final bool done;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: <Widget>[
          Icon(done ? Icons.check_circle_rounded : Icons.radio_button_unchecked, color: done ? AppColors.success : AppColors.textSecondary),
          const SizedBox(width: 10),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.bold = false});

  final String label;
  final double value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: <Widget>[
          Expanded(child: Text(label)),
          Text(
            '${value < 0 ? '-' : ''}Rs ${value.abs().toStringAsFixed(0)}',
            style: TextStyle(fontWeight: bold ? FontWeight.w900 : FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
