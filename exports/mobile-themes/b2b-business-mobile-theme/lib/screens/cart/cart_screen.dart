import 'package:flutter/material.dart';

import '../../mock_data/mock_data.dart';
import '../../theme/app_colors.dart';
import '../../widgets/cart/cart_item_card.dart';
import '../../widgets/common/state_views.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key, this.showEmpty = false, this.loginRequired = false});

  final bool showEmpty;
  final bool loginRequired;

  @override
  Widget build(BuildContext context) {
    if (loginRequired) {
      return const AppStateView(
        icon: Icons.lock_outline_rounded,
        title: 'Login required',
        message: 'Sign in to sync your cart and continue checkout.',
        actionLabel: 'Go to Login',
      );
    }
    if (showEmpty || MockData.cart.isEmpty) {
      return const AppStateView(
        icon: Icons.shopping_cart_outlined,
        title: 'Your cart is empty',
        message: 'Add products from home to start a business order.',
        actionLabel: 'Start Shopping',
      );
    }

    final subtotal = MockData.cart.fold<double>(0, (sum, item) => sum + item.total);
    const discount = 45.0;
    const delivery = 30.0;
    const tax = 80.0;
    final grandTotal = subtotal - discount + delivery + tax;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Text('${MockData.cart.length} Items', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 12),
          ...MockData.cart.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: CartItemCard(item: item, onDelete: () {}),
              )),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: <Widget>[
                  _PriceRow('Subtotal', subtotal),
                  const _PriceRow('Discount', -discount, color: AppColors.success),
                  const _PriceRow('Delivery', delivery),
                  const _PriceRow('Tax', tax),
                  const Divider(height: 24),
                  _PriceRow('Grand Total', grandTotal, bold: true),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () {},
            child: const Text('Proceed to Checkout'),
          ),
          const SizedBox(height: 8),
          Text(
            'Guest cart will be linked to your account after login.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow(this.label, this.value, {this.bold = false, this.color});

  final String label;
  final double value;
  final bool bold;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: <Widget>[
          Expanded(child: Text(label)),
          Text(
            '${value < 0 ? '-' : ''}Rs ${value.abs().toStringAsFixed(0)}',
            style: TextStyle(
              color: color,
              fontWeight: bold ? FontWeight.w900 : FontWeight.w700,
              fontSize: bold ? 18 : 14,
            ),
          ),
        ],
      ),
    );
  }
}
