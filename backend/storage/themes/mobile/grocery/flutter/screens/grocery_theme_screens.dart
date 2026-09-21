import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ridego/core/localization/language_provider.dart';
import 'package:ridego/features/auth/auth_screen.dart';
import 'package:ridego/features/b2b/b2b_providers.dart';
import 'package:ridego/features/b2b/b2b_screens.dart';
import 'package:ridego/features/cart/cart_provider.dart';
import 'package:ridego/features/cart/cart_screen.dart';
import 'package:ridego/features/categories/category_screen.dart';
import 'package:ridego/features/credit/credit_screen.dart';
import 'package:ridego/features/orders/orders_provider.dart';
import 'package:ridego/features/orders/orders_screen.dart';
import 'package:ridego/features/products/product_detail_screen.dart';
import 'package:ridego/features/products/products_provider.dart';
import 'package:ridego/features/settings/settings_detail_screens.dart';
import 'package:ridego/features/settings/settings_screen.dart';
import 'package:ridego/features/wishlist/wishlist_screen.dart';
import 'package:ridego/shared/models/models.dart';

import '../widgets/grocery_widgets.dart';

class GrocerySplashScreen extends ConsumerWidget {
  const GrocerySplashScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 86, height: 86, decoration: BoxDecoration(color: colors.primaryContainer, borderRadius: BorderRadius.circular(8)), child: Icon(Icons.storefront, size: 48, color: colors.primary)),
              const SizedBox(height: 18),
              Text(t('Grocery Distributor'), textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text(t('Wholesale FMCG ordering for retailers'), textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colors.onSurfaceVariant)),
              const SizedBox(height: 26),
              const LinearProgressIndicator(minHeight: 4),
            ],
          ),
        ),
      ),
    );
  }
}

class GroceryLoginScreen extends StatelessWidget {
  const GroceryLoginScreen({super.key});
  @override
  Widget build(BuildContext context) => const AuthScreen();
}

class GroceryHomeScreen extends ConsumerWidget {
  const GroceryHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(categoriesProvider);
    final products = ref.watch(productsProvider);
    final t = ref.watch(appTranslatorProvider);
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(categoriesProvider);
            ref.invalidate(productsProvider);
          },
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _GroceryHeader()),
              SliverToBoxAdapter(child: _HeroBanners()),
              SliverToBoxAdapter(
                child: categories.when(
                  data: (rows) => _CategoryStrip(categories: rows),
                  loading: () => const SizedBox(height: 132, child: Center(child: CircularProgressIndicator())),
                  error: (_, __) => _InlineState(label: t('Could not load categories')),
                ),
              ),
              SliverToBoxAdapter(child: _BrandStrip()),
              products.when(
                data: (rows) => SliverList(
                  delegate: SliverChildListDelegate([
                    _ProductRail(title: 'Best Selling Products', subtitle: 'High velocity grocery SKUs', products: rows.take(10).toList()),
                    _ProductRail(title: 'Daily Essentials', products: rows.where((p) => p.categoryId.contains('grocery') || p.categoryId.contains('sugar') || p.categoryId.contains('rice')).toList()),
                    _ProductRail(title: 'Beverages', products: rows.where((p) => p.categoryId.contains('beverages')).toList()),
                    _ProductRail(title: 'Snacks & Biscuits', products: rows.where((p) => p.categoryId.contains('biscuits')).toList()),
                    _ProductRail(title: 'Dairy Products', products: rows.where((p) => p.categoryId.contains('dairy')).toList()),
                    _ProductRail(title: 'Cooking Essentials', products: rows.where((p) => p.categoryId.contains('oil') || p.categoryId.contains('pulses') || p.categoryId.contains('spices')).toList()),
                    _ProductRail(title: 'Cleaning Products', products: rows.where((p) => p.categoryId.contains('cleaning')).toList()),
                    _ProductRail(title: 'Personal Care', products: rows.where((p) => p.categoryId.contains('personal')).toList()),
                    _DealBand(),
                    _ProductRail(title: 'Recently Ordered', products: rows.reversed.take(8).toList()),
                    _ProductRail(title: 'Recommended Products', products: rows.skip(rows.length > 6 ? 6 : 0).take(10).toList()),
                    const SizedBox(height: 96),
                  ]),
                ),
                loading: () => const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
                error: (_, __) => SliverFillRemaining(child: _InlineState(label: t('Could not load products'))),
              ),
            ],
          ),
        ),
      ),
      backgroundColor: colors.surface,
    );
  }
}

class GroceryCategoriesScreen extends StatelessWidget {
  const GroceryCategoriesScreen({super.key});
  @override
  Widget build(BuildContext context) => const CategoryScreen();
}

class GrocerySubCategoriesScreen extends ConsumerWidget {
  const GrocerySubCategoriesScreen({super.key, required this.category});
  final Category category;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(category.name)),
      body: products.when(
        data: (rows) => _ProductGrid(products: rows.where((p) => p.categoryId == category.id || p.categoryId == category.slug || p.categoryId == category.name).toList()),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _InlineState(label: '$e'),
      ),
    );
  }
}

class GroceryProductListingScreen extends ConsumerWidget {
  const GroceryProductListingScreen({super.key, this.title = 'Products'});
  final String title;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(title), actions: [IconButton(onPressed: () {}, icon: const Icon(Icons.tune))]),
      body: products.when(data: (rows) => _ProductGrid(products: rows), loading: () => const Center(child: CircularProgressIndicator()), error: (e, _) => _InlineState(label: '$e')),
    );
  }
}

class GroceryProductDetailsScreen extends StatelessWidget {
  const GroceryProductDetailsScreen({super.key, required this.product});
  final Product product;
  @override
  Widget build(BuildContext context) => ProductDetailScreen(product: product);
}

class GrocerySearchScreen extends ConsumerStatefulWidget {
  const GrocerySearchScreen({super.key});
  @override
  ConsumerState<GrocerySearchScreen> createState() => _GrocerySearchScreenState();
}

class _GrocerySearchScreenState extends ConsumerState<GrocerySearchScreen> {
  final controller = TextEditingController();
  @override
  void dispose() { controller.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final t = ref.watch(appTranslatorProvider);
    final products = ref.watch(productsProvider);
    return Scaffold(
      appBar: AppBar(title: TextField(controller: controller, autofocus: true, decoration: InputDecoration(hintText: t('Search SKUs, brands, products')), onChanged: (v) => setState(() => ref.read(productsSearchProvider.notifier).state = v))),
      body: products.when(data: (rows) => _ProductGrid(products: rows), loading: () => const Center(child: CircularProgressIndicator()), error: (e, _) => _InlineState(label: '$e')),
    );
  }
}

class GroceryWishlistScreen extends StatelessWidget { const GroceryWishlistScreen({super.key}); @override Widget build(BuildContext context) => const WishlistScreen(); }
class GroceryCartScreen extends StatelessWidget { const GroceryCartScreen({super.key}); @override Widget build(BuildContext context) => const CartScreen(); }

class GroceryCheckoutScreen extends ConsumerWidget {
  const GroceryCheckoutScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final t = ref.watch(appTranslatorProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t('Checkout'))),
      body: cart.when(
        data: (items) => ListView(padding: const EdgeInsets.all(16), children: [
          _CheckoutTile(icon: Icons.location_on_outlined, title: t('Delivery address'), subtitle: t('Choose outlet or warehouse address')),
          _CheckoutTile(icon: Icons.receipt_long_outlined, title: t('GST invoice'), subtitle: t('GSTIN and legal business profile')),
          _CheckoutTile(icon: Icons.credit_score_outlined, title: t('Credit / payment'), subtitle: t('Use credit limit, UPI, NEFT or COD')),
          const SizedBox(height: 12),
          for (final item in items) ListTile(contentPadding: EdgeInsets.zero, title: Text(item.name), subtitle: Text('${t('Qty')} ${item.quantity}'), trailing: Text('₹${item.lineTotal.toStringAsFixed(2)}')),
          const SizedBox(height: 18),
          FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.lock_outline), label: Text(t('Place wholesale order'))),
        ]),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _InlineState(label: '$e'),
      ),
    );
  }
}

class GroceryOrdersScreen extends StatelessWidget { const GroceryOrdersScreen({super.key}); @override Widget build(BuildContext context) => const OrdersScreen(); }

class GroceryOrderDetailsScreen extends ConsumerWidget {
  const GroceryOrderDetailsScreen({super.key, required this.order});
  final OrderSummary order;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timeline = ref.watch(orderTimelineProvider(order.id));
    return Scaffold(
      appBar: AppBar(title: Text(order.id)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _CheckoutTile(icon: Icons.local_shipping_outlined, title: order.status, subtitle: '₹${order.total.toStringAsFixed(2)}'),
        const SizedBox(height: 12),
        timeline.when(
          data: (events) => Column(children: events.map((e) => ListTile(leading: const Icon(Icons.check_circle_outline), title: Text(e.title), subtitle: Text(e.description ?? e.status))).toList()),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _InlineState(label: '$e'),
        )
      ]),
    );
  }
}

class GroceryInvoiceScreen extends ConsumerWidget {
  const GroceryInvoiceScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoices = ref.watch(invoiceCenterProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Invoices')),
      body: invoices.when(
        data: (rows) => ListView.separated(padding: const EdgeInsets.all(16), itemCount: rows.length, separatorBuilder: (_, __) => const SizedBox(height: 10), itemBuilder: (_, i) {
          final row = rows[i];
          return _CheckoutTile(icon: Icons.picture_as_pdf_outlined, title: row.invoiceNumber, subtitle: '${row.orderId} • GST ₹${row.gstTotal.toStringAsFixed(2)} • Total ₹${row.total.toStringAsFixed(2)}');
        }),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _InlineState(label: '$e'),
      ),
    );
  }
}

class GroceryRfqScreen extends ConsumerWidget {
  const GroceryRfqScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rfqs = ref.watch(rfqProvider);
    final quotes = ref.watch(quotationProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('RFQ')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const GrocerySectionHeader(title: 'Requested Quotes', subtitle: 'Negotiate bulk rates for large orders'),
        rfqs.when(data: (rows) => Column(children: rows.map((r) => _CheckoutTile(icon: Icons.request_quote_outlined, title: r.productName, subtitle: '${r.quantity} units • ${r.status}')).toList()), loading: () => const LinearProgressIndicator(), error: (e, _) => _InlineState(label: '$e')),
        const SizedBox(height: 18),
        const GrocerySectionHeader(title: 'Quotations'),
        quotes.when(data: (rows) => Column(children: rows.map((q) => _CheckoutTile(icon: Icons.price_check_outlined, title: q.productName, subtitle: '${q.quantity} units • ₹${q.quotedPrice.toStringAsFixed(2)} • ${q.status}')).toList()), loading: () => const LinearProgressIndicator(), error: (e, _) => _InlineState(label: '$e')),
      ]),
    );
  }
}

class GroceryProfileScreen extends StatelessWidget { const GroceryProfileScreen({super.key}); @override Widget build(BuildContext context) => const SettingsScreen(); }
class GroceryAddressBookScreen extends StatelessWidget { const GroceryAddressBookScreen({super.key}); @override Widget build(BuildContext context) => const AddressBookScreen(); }
class GroceryBusinessProfileScreen extends StatelessWidget { const GroceryBusinessProfileScreen({super.key}); @override Widget build(BuildContext context) => const BusinessGstScreen(); }
class GroceryGstScreen extends StatelessWidget { const GroceryGstScreen({super.key}); @override Widget build(BuildContext context) => const BusinessGstScreen(); }
class GroceryCreditScreen extends StatelessWidget { const GroceryCreditScreen({super.key}); @override Widget build(BuildContext context) => const CreditScreen(); }
class GroceryNotificationsScreen extends StatelessWidget { const GroceryNotificationsScreen({super.key}); @override Widget build(BuildContext context) => const NotificationPreferencesScreen(); }
class GroceryHelpSupportScreen extends StatelessWidget { const GroceryHelpSupportScreen({super.key}); @override Widget build(BuildContext context) => const HelpSupportScreen(); }
class GrocerySettingsScreen extends StatelessWidget { const GrocerySettingsScreen({super.key}); @override Widget build(BuildContext context) => const SettingsScreen(); }

class _GroceryHeader extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t('Grocery Distributor'), style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
            Text(t('Bulk FMCG ordering with GST invoice'), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant, fontWeight: FontWeight.w700)),
          ])),
          IconButton.filledTonal(onPressed: () {}, icon: const Icon(Icons.notifications_outlined)),
        ],
      ),
    );
  }
}

class _HeroBanners extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 172,
      child: PageView(
        padEnds: false,
        controller: PageController(viewportFraction: .9),
        children: const [
          _BannerCard(title: 'Monthly Staples', subtitle: 'Atta, rice, dal and oil at distributor rates', icon: Icons.rice_bowl_outlined),
          _BannerCard(title: 'FMCG Brand Week', subtitle: 'Amul, Tata, Parle, Britannia and more', icon: Icons.verified_outlined),
          _BannerCard(title: 'Cleaning Stock-Up', subtitle: 'Bulk detergents, dishwash and floor cleaners', icon: Icons.cleaning_services_outlined),
        ],
      ),
    );
  }
}

class _BannerCard extends StatelessWidget {
  const _BannerCard({required this.title, required this.subtitle, required this.icon});
  final String title; final String subtitle; final IconData icon;
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 4, 12),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: colors.primary, borderRadius: BorderRadius.circular(8)),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: colors.onPrimary, fontWeight: FontWeight.w900)),
            const SizedBox(height: 7),
            Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colors.onPrimary.withValues(alpha: .86), fontWeight: FontWeight.w700)),
          ])),
          Icon(icon, size: 72, color: colors.onPrimary.withValues(alpha: .9)),
        ]),
      ),
    );
  }
}

class _CategoryStrip extends StatelessWidget {
  const _CategoryStrip({required this.categories});
  final List<Category> categories;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 0, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Padding(padding: EdgeInsets.only(right: 16), child: GrocerySectionHeader(title: 'Shop by Category')),
        SizedBox(height: 104, child: ListView.separated(scrollDirection: Axis.horizontal, itemCount: categories.length, separatorBuilder: (_, __) => const SizedBox(width: 10), itemBuilder: (_, i) {
          final c = categories[i];
          return SizedBox(width: 82, child: Column(children: [
            Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(8), child: GroceryAssetImage(url: c.imageUrl, icon: Icons.category_outlined))),
            const SizedBox(height: 6),
            Text(c.name, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w800, height: 1.05)),
          ]));
        })),
      ]),
    );
  }
}

class _BrandStrip extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final brands = ['Amul', 'Tata', 'Parle', 'Britannia', 'Maggi', 'Coca-Cola', 'Pepsi', 'Surf Excel', 'Vim', 'Colgate', 'Aashirvaad', 'Fortune', 'Nescafe'];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 0, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Padding(padding: EdgeInsets.only(right: 16), child: GrocerySectionHeader(title: 'FMCG Brands')),
        SizedBox(height: 48, child: ListView.separated(scrollDirection: Axis.horizontal, itemCount: brands.length, separatorBuilder: (_, __) => const SizedBox(width: 8), itemBuilder: (_, i) => Chip(label: Text(brands[i]), avatar: const Icon(Icons.verified_outlined, size: 16)))),
      ]),
    );
  }
}

class _ProductRail extends StatelessWidget {
  const _ProductRail({required this.title, this.subtitle, required this.products});
  final String title; final String? subtitle; final List<Product> products;
  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 0, 8),
      child: Column(children: [
        Padding(padding: const EdgeInsets.only(right: 16), child: GrocerySectionHeader(title: title, subtitle: subtitle, actionLabel: 'View all')),
        SizedBox(height: 260, child: ListView.separated(scrollDirection: Axis.horizontal, itemCount: products.length, separatorBuilder: (_, __) => const SizedBox(width: 12), itemBuilder: (_, i) {
          final p = products[i];
          return SizedBox(width: 164, child: GroceryProductCard(product: p, onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ProductDetailScreen(product: p)))));
        })),
      ]),
    );
  }
}

class _DealBand extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: colors.tertiaryContainer, borderRadius: BorderRadius.circular(8)),
        child: Row(children: [
          Icon(Icons.local_offer_outlined, color: colors.onTertiaryContainer),
          const SizedBox(width: 12),
          Expanded(child: Text(t('Wholesale Deals: unlock extra margin with slab pricing on high volume SKUs.'), style: TextStyle(color: colors.onTertiaryContainer, fontWeight: FontWeight.w800))),
        ]),
      ),
    );
  }
}

class _ProductGrid extends StatelessWidget {
  const _ProductGrid({required this.products});
  final List<Product> products;
  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const _InlineState(label: 'No products found');
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: .58, crossAxisSpacing: 12, mainAxisSpacing: 12),
      itemCount: products.length,
      itemBuilder: (_, i) {
        final p = products[i];
        return GroceryProductCard(product: p, onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ProductDetailScreen(product: p))));
      },
    );
  }
}

class _CheckoutTile extends StatelessWidget {
  const _CheckoutTile({required this.icon, required this.title, required this.subtitle});
  final IconData icon; final String title; final String subtitle;
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      child: ListTile(
        leading: Icon(icon, color: colors.primary),
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis),
      ),
    );
  }
}

class _InlineState extends StatelessWidget {
  const _InlineState({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(label, textAlign: TextAlign.center)));
}
