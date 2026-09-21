import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/config/storefront_app_config_provider.dart';
import '../../core/layout/responsive_layout.dart';
import '../../core/localization/language_provider.dart';
import '../../features/cart/cart_provider.dart';
import '../../features/credit/credit_provider.dart';
import '../../features/orders/orders_provider.dart';
import '../../features/products/products_provider.dart';
import '../../shared/models/models.dart';
import '../../shared/widgets/app_feedback.dart';

typedef ComponentBuilder = Widget Function(BuildContext context, WidgetRef ref);

class ThemeComponentRegistry {
  const ThemeComponentRegistry._();

  static Map<String, ComponentBuilder> map() {
    return <String, ComponentBuilder>{
      'banner': (BuildContext context, WidgetRef ref) => const _BannerWidget(),
      'products_grid': (BuildContext context, WidgetRef ref) =>
          const _ProductGrid(),
      'products_list': (BuildContext context, WidgetRef ref) =>
          const _ProductList(),
      'categories': (BuildContext context, WidgetRef ref) =>
          const _CategoryList(),
      'cart_summary': (BuildContext context, WidgetRef ref) =>
          const _CartSummary(),
      'credit_card': (BuildContext context, WidgetRef ref) =>
          const _CreditCardWidget(),
      'orders_list': (BuildContext context, WidgetRef ref) =>
          const _OrderListWidget(),
    };
  }
}

class _BannerWidget extends ConsumerWidget {
  const _BannerWidget();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(12)),
      child: Text(t('Seasonal offers for your business')),
    );
  }
}

String _productPriceLabel(Product p, String Function(String) t) {
  return p.price != null
      ? '₹${p.price!.toStringAsFixed(2)}'
      : t('Price on request');
}

class _ProductGrid extends ConsumerWidget {
  const _ProductGrid();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productsProvider).valueOrNull ?? const [];
    final String? token = ref.watch(authTokenProvider);
    final bool guest = token == null || token.isEmpty;
    final bool allowGuestCart =
        ref.watch(storefrontAppConfigProvider).asData?.value.allowGuestCart ??
            false;
    final t = ref.watch(appTranslatorProvider);
    final bool canAddToCart = !guest || allowGuestCart;
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final int columns = ResponsiveLayout.gridColumns(
          constraints.maxWidth - 24,
          minimumItemWidth: 240,
        );
        return GridView.builder(
          itemCount: products.length,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.all(12),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            childAspectRatio: columns == 1 ? 3 : 1.25,
          ),
          itemBuilder: (_, int i) {
            final p = products[i];
            return Card(
              child: ListTile(
                title: Text(
                  t(p.name),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  _productPriceLabel(p, t),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: IconButton(
                  onPressed: canAddToCart
                      ? () async {
                          await ref.read(cartProvider.notifier).addProduct(p.id);
                          if (!context.mounted) return;
                          showAppFeedback(
                            context,
                            message: '${t(p.name)} ${t('added to cart.')}',
                            type: AppFeedbackType.success,
                          );
                        }
                      : () {
                          showAppFeedback(
                            context,
                            message: t('Sign in to add items to your cart.'),
                            type: AppFeedbackType.info,
                          );
                        },
                  icon: const Icon(Icons.add_circle_outline),
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _ProductList extends ConsumerWidget {
  const _ProductList();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productsProvider).valueOrNull ?? const [];
    final String? token = ref.watch(authTokenProvider);
    final bool guest = token == null || token.isEmpty;
    final bool allowGuestCart =
        ref.watch(storefrontAppConfigProvider).asData?.value.allowGuestCart ??
            false;
    final t = ref.watch(appTranslatorProvider);
    final bool canAddToCart = !guest || allowGuestCart;
    return ListView.builder(
      itemCount: products.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemBuilder: (_, int i) {
        final p = products[i];
        return ListTile(
          title: Text(t(p.name)),
          subtitle: Text(_productPriceLabel(p, t)),
          trailing: IconButton(
              onPressed: canAddToCart
                  ? () async {
                      await ref.read(cartProvider.notifier).addProduct(p.id);
                      if (!context.mounted) return;
                      showAppFeedback(
                        context,
                        message: '${t(p.name)} ${t('added to cart.')}',
                        type: AppFeedbackType.success,
                      );
                    }
                  : () {
                      showAppFeedback(
                        context,
                        message: t('Sign in to add items to your cart.'),
                        type: AppFeedbackType.info,
                      );
                    },
              icon: const Icon(Icons.add)),
        );
      },
    );
  }
}

class _CategoryList extends ConsumerWidget {
  const _CategoryList();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(categoriesProvider).valueOrNull ?? const [];
    final t = ref.watch(appTranslatorProvider);
    return SizedBox(
      height: 50,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: categories
            .map((c) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Chip(label: Text(t(c.name))),
                ))
            .toList(),
      ),
    );
  }
}

class _CartSummary extends ConsumerWidget {
  const _CartSummary();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final total = ref.watch(cartTotalProvider);
    final t = ref.watch(appTranslatorProvider);
    return ListTile(
        title: Text(t('Cart Total')),
        trailing: Text('₹${total.toStringAsFixed(2)}'));
  }
}

class _CreditCardWidget extends ConsumerWidget {
  const _CreditCardWidget();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final creditAsync = ref.watch(creditProvider);
    return creditAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => Card(
        child: ListTile(title: Text(t('Credit data is not available yet.'))),
      ),
      data: (credit) {
        if (credit == null) return const SizedBox.shrink();
        final available =
            (credit.limit - credit.outstanding).clamp(0, double.infinity);
        final usagePct = (credit.usage * 100).clamp(0, 999).toStringAsFixed(0);
        return Card(
          child: ListTile(
            title: Text(t('Credit Available')),
            subtitle: Text('${t('Used')}: $usagePct%'),
            trailing: Text('₹${available.toStringAsFixed(0)}'),
          ),
        );
      },
    );
  }
}

class _OrderListWidget extends ConsumerWidget {
  const _OrderListWidget();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(ordersProvider).valueOrNull ?? const [];
    final t = ref.watch(appTranslatorProvider);
    return Column(
      children: orders
          .map((o) => ListTile(
                title: Text('${t('Order')} ${o.id}'),
                subtitle: Text(t(o.status)),
                trailing: Text('₹${o.total.toStringAsFixed(0)}'),
              ))
          .toList(),
    );
  }
}
