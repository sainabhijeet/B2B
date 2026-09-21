import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/language_provider.dart';
import '../../shared/models/models.dart';
import '../cart/cart_screen.dart';

class CheckoutScreen extends ConsumerWidget {
  const CheckoutScreen({super.key, this.buyNowItem});

  /// A transient checkout line. It is intentionally separate from cart state.
  final CartItem? buyNowItem;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String Function(String) t = ref.watch(appTranslatorProvider);
    final ColorScheme colors = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 60,
        backgroundColor: colors.primary,
        foregroundColor: colors.onPrimary,
        centerTitle: false,
        leadingWidth: 64,
        leading: Padding(
          padding: const EdgeInsets.only(left: 12),
          child: IconButton(
            tooltip: t('Back'),
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        title: Text(
          t('Checkout'),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: colors.onPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: CartScreen(checkoutMode: true, buyNowItem: buyNowItem),
    );
  }
}
