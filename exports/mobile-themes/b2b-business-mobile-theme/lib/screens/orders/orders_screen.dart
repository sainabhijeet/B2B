import 'package:flutter/material.dart';

import '../../mock_data/mock_data.dart';
import '../../models/mock_models.dart';
import '../../widgets/common/state_views.dart';
import '../../widgets/order/order_card.dart';
import '../order_detail/order_detail_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key, this.loginRequired = false, this.ordersDisabled = false});

  final bool loginRequired;
  final bool ordersDisabled;

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  OrderStatus? _filter;

  @override
  Widget build(BuildContext context) {
    if (widget.loginRequired) {
      return const AppStateView(
        icon: Icons.lock_outline_rounded,
        title: 'Login required',
        message: 'Sign in to view previous orders and place new ones.',
        actionLabel: 'Login to Order',
      );
    }
    if (widget.ordersDisabled) {
      return const AppStateView(
        icon: Icons.block_rounded,
        title: 'Orders disabled',
        message: 'This store has currently turned off order features.',
      );
    }

    final orders = _filter == null
        ? MockData.orders
        : MockData.orders.where((order) => order.status == _filter).toList();

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Text('Recent Orders', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: <Widget>[
                _FilterChip(label: 'All', selected: _filter == null, onTap: () => setState(() => _filter = null)),
                ...<OrderStatus>[
                  OrderStatus.pending,
                  OrderStatus.processing,
                  OrderStatus.delivered,
                  OrderStatus.cancelled,
                ].map((status) => _FilterChip(
                      label: status.name[0].toUpperCase() + status.name.substring(1),
                      selected: _filter == status,
                      onTap: () => setState(() => _filter = status),
                    )),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (orders.isEmpty)
            const AppStateView(
              icon: Icons.receipt_long_outlined,
              title: 'No orders yet',
              message: 'Your completed orders will appear here.',
              actionLabel: 'Start Shopping',
            )
          else
            ...orders.map((order) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: OrderCard(
                    order: order,
                    onViewDetails: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => OrderDetailScreen(order: order),
                      ),
                    ),
                    onReorder: () {},
                  ),
                )),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}
