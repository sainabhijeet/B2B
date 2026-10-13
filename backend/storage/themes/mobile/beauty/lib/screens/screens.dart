import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../l10n/app_strings.dart';
import '../theme/beauty_theme.dart';
import '../widgets/beauty_widgets.dart';

const categoryData = [
  ('skin-care', 'skin_care'),
  ('hair-care', 'hair_care'),
  ('makeup', 'makeup'),
  ('fragrance', 'fragrance'),
  ('mens-grooming', 'mens_grooming'),
  ('baby-care', 'baby_care'),
  ('personal-hygiene', 'personal_hygiene'),
  ('salon-essentials', 'salon_essentials'),
];

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 900), () {
      if (mounted) Navigator.pushReplacementNamed(context, '/onboarding');
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [BeautyColors.primary, BeautyColors.accent],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.spa_rounded, size: 84, color: Colors.white),
            const SizedBox(height: 18),
            Text(
              tr('brand_name'),
              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              tr('brand_tagline'),
              style: const TextStyle(color: Colors.white70),
            ),
          ],
        ),
      ),
    ),
  );
}

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () =>
                    Navigator.pushReplacementNamed(context, '/login'),
                child: Text(tr('skip')),
              ),
            ),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: Image.asset(
                  'assets/banners/luxury-makeup-1080x1080.png',
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(height: 28),
            Text(
              tr('onboarding_title'),
              style: Theme.of(
                context,
              ).textTheme.headlineLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            Text(
              tr('onboarding_body'),
              style: Theme.of(
                context,
              ).textTheme.bodyLarge?.copyWith(color: BeautyColors.muted),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () =>
                  Navigator.pushReplacementNamed(context, '/login'),
              child: Text(tr('get_started')),
            ),
          ],
        ),
      ),
    ),
  );
}

class AuthScreen extends StatelessWidget {
  const AuthScreen({super.key, this.otp = false});
  final bool otp;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Icon(Icons.spa_rounded, size: 64, color: BeautyColors.primary),
        const SizedBox(height: 22),
        Text(
          tr(otp ? 'verify_otp' : 'welcome'),
          style: Theme.of(
            context,
          ).textTheme.headlineLarge?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 22),
        TextField(
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            labelText: tr(otp ? 'otp_hint' : 'phone_number'),
            prefixText: otp ? null : '+91 ',
          ),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () =>
              Navigator.pushReplacementNamed(context, otp ? '/home' : '/otp'),
          child: Text(tr('continue')),
        ),
      ],
    ),
  );
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            tr('brand_name'),
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              color: BeautyColors.primary,
            ),
          ),
          Text(
            tr('brand_tagline'),
            style: const TextStyle(fontSize: 10, color: BeautyColors.muted),
          ),
        ],
      ),
      actions: [
        IconButton(
          onPressed: () => Navigator.pushNamed(context, '/notifications'),
          icon: const Icon(Icons.notifications_none_rounded),
        ),
        IconButton(
          onPressed: () => Navigator.pushNamed(context, '/cart'),
          icon: const Badge(child: Icon(Icons.shopping_bag_outlined)),
        ),
      ],
    ),
    body: ListView(
      children: [
        const BeautySearchBar(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Stack(
              alignment: Alignment.bottomLeft,
              children: [
                Image.asset(
                  'assets/banners/skin-care-sale-1200x628.png',
                  height: 215,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
                Container(
                  height: 215,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.black54, Colors.transparent],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        tr('sale_skin'),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 25,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      FilledButton(
                        onPressed: () =>
                            Navigator.pushNamed(context, '/offers'),
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: BeautyColors.primary,
                        ),
                        child: Text(tr('shop_now')),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SectionTitle('top_categories'),
        SizedBox(
          height: 108,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemBuilder: (_, i) => SizedBox(
              width: 96,
              child: CategoryTile(
                id: categoryData[i].$1,
                label: categoryData[i].$2,
              ),
            ),
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemCount: categoryData.length,
          ),
        ),
        const SectionTitle('flash_deals'),
        const ProductGrid(count: 4),
        const SectionTitle('best_sellers'),
        const ProductGrid(count: 4),
        const SizedBox(height: 30),
      ],
    ),
    bottomNavigationBar: const AppBottomNav(index: 0),
  );
}

class AppBottomNav extends StatelessWidget {
  const AppBottomNav({super.key, required this.index});
  final int index;
  @override
  Widget build(BuildContext context) => NavigationBar(
    selectedIndex: index,
    onDestinationSelected: (i) {
      final route = ['/home', '/category', '/offers', '/orders', '/profile'][i];
      if (i != index) Navigator.pushReplacementNamed(context, route);
    },
    destinations: [
      NavigationDestination(
        icon: const Icon(Icons.home_outlined),
        selectedIcon: const Icon(Icons.home_rounded),
        label: tr('home'),
      ),
      NavigationDestination(
        icon: const Icon(Icons.grid_view_outlined),
        label: tr('categories'),
      ),
      NavigationDestination(
        icon: const Icon(Icons.local_offer_outlined),
        label: tr('offers'),
      ),
      NavigationDestination(
        icon: const Icon(Icons.receipt_long_outlined),
        label: tr('orders'),
      ),
      NavigationDestination(
        icon: const Icon(Icons.person_outline_rounded),
        label: tr('profile'),
      ),
    ],
  );
}

class CategoryScreen extends StatelessWidget {
  const CategoryScreen({super.key, this.sub = false});
  final bool sub;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(sub ? 'skin_care' : 'categories'))),
    body: GridView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: categoryData.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: .9,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemBuilder: (_, i) =>
          CategoryTile(id: categoryData[i].$1, label: categoryData[i].$2),
    ),
    bottomNavigationBar: sub ? null : const AppBottomNav(index: 1),
  );
}

class ProductListScreen extends StatelessWidget {
  const ProductListScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr('skin_care'))),
    body: CustomScrollView(
      slivers: [
        const SliverToBoxAdapter(child: BeautySearchBar()),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => showModalBottomSheet(
                      context: context,
                      builder: (_) => const FilterSheet(),
                    ),
                    icon: const Icon(Icons.tune),
                    label: Text(tr('filters')),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => showModalBottomSheet(
                      context: context,
                      builder: (_) => const SortSheet(),
                    ),
                    icon: const Icon(Icons.swap_vert),
                    label: Text(tr('sort')),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SliverToBoxAdapter(child: ProductGrid()),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
      ],
    ),
  );
}

class FilterSheet extends StatelessWidget {
  const FilterSheet({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(tr('filters'), style: Theme.of(context).textTheme.titleLarge),
          ...categoryData
              .take(4)
              .map(
                (x) => CheckboxListTile(
                  value: false,
                  onChanged: (_) {},
                  title: Text(tr(x.$2)),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: Text(tr('apply')),
          ),
        ],
      ),
    ),
  );
}

class SortSheet extends StatelessWidget {
  const SortSheet({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        ListTile(
          title: Text(tr('sort')),
          titleTextStyle: Theme.of(context).textTheme.titleLarge,
        ),
        RadioListTile<int>(
          value: 1,
          groupValue: 1,
          onChanged: (_) => Navigator.pop(context),
          title: Text(tr('sort_popular')),
        ),
        RadioListTile<int>(
          value: 2,
          groupValue: 1,
          onChanged: (_) => Navigator.pop(context),
          title: Text(tr('price')),
        ),
      ],
    ),
  );
}

class ProductDetailScreen extends StatelessWidget {
  const ProductDetailScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      actions: [
        IconButton(onPressed: () {}, icon: const Icon(Icons.favorite_border)),
        IconButton(
          onPressed: () => Navigator.pushNamed(context, '/cart'),
          icon: const Icon(Icons.shopping_bag_outlined),
        ),
      ],
    ),
    body: ListView(
      children: [
        AspectRatio(
          aspectRatio: 1,
          child: SvgPicture.asset(
            'assets/images/product-radiance-serum.svg',
            fit: BoxFit.cover,
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                tr('product_brand'),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: BeautyColors.primary,
                  letterSpacing: 1,
                ),
              ),
              Text(
                tr('product_name'),
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const RatingView(),
              const SizedBox(height: 12),
              Text(
                tr('product_desc'),
                style: const TextStyle(color: BeautyColors.muted, height: 1.5),
              ),
              const SizedBox(height: 18),
              const Text(
                '₹498',
                style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900),
              ),
              Text(
                '${tr('case_pack')}: 12 ${tr('units')}',
                style: const TextStyle(color: BeautyColors.muted),
              ),
              const SizedBox(height: 20),
              const QuantityStepper(),
              const SectionTitle('related_products', action: false),
              const ProductGrid(count: 2),
            ],
          ),
        ),
      ],
    ),
    bottomNavigationBar: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: FilledButton.icon(
          onPressed: () => showBeautySnack(context, 'added'),
          icon: const Icon(Icons.shopping_bag_outlined),
          label: Text(tr('add_to_cart')),
        ),
      ),
    ),
  );
}

class CampaignScreen extends StatelessWidget {
  const CampaignScreen({
    super.key,
    required this.titleKey,
    required this.banner,
    this.navIndex,
  });
  final String titleKey;
  final String banner;
  final int? navIndex;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(titleKey))),
    body: ListView(
      children: [
        Image.asset(
          'assets/banners/$banner-1080x1080.png',
          height: 300,
          fit: BoxFit.cover,
        ),
        SectionTitle(titleKey),
        const ProductGrid(),
        const SizedBox(height: 24),
      ],
    ),
    bottomNavigationBar: navIndex == null
        ? null
        : AppBottomNav(index: navIndex!),
  );
}

class SearchScreen extends StatelessWidget {
  const SearchScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr('search_results'))),
    body: const Column(
      children: [
        BeautySearchBar(),
        Expanded(child: SingleChildScrollView(child: ProductGrid())),
      ],
    ),
  );
}

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr('cart'))),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ...List.generate(
          3,
          (i) => Card(
            child: ListTile(
              contentPadding: const EdgeInsets.all(10),
              leading: SizedBox(width: 72, child: ProductCard(index: i)),
              title: Text(
                ProductCard.names[i],
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text('₹${498 + i * 60} · ${tr('case_pack')} 12'),
              trailing: const QuantityStepper(),
            ),
          ),
        ),
        const SizedBox(height: 18),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              children: const [
                _SummaryRow('subtotal', '₹7,284'),
                _SummaryRow('gst', '₹1,311'),
                _SummaryRow('shipping', 'FREE'),
                Divider(),
                _SummaryRow('total', '₹8,595', strong: true),
              ],
            ),
          ),
        ),
      ],
    ),
    bottomNavigationBar: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: FilledButton(
          onPressed: () => Navigator.pushNamed(context, '/checkout'),
          child: Text(tr('checkout')),
        ),
      ),
    ),
  );
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow(this.keyName, this.value, {this.strong = false});
  final String keyName;
  final String value;
  final bool strong;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 7),
    child: Row(
      children: [
        Expanded(child: Text(tr(keyName))),
        Text(
          value,
          style: TextStyle(
            fontWeight: strong ? FontWeight.w900 : FontWeight.w600,
            fontSize: strong ? 20 : 14,
          ),
        ),
      ],
    ),
  );
}

class CheckoutScreen extends StatelessWidget {
  const CheckoutScreen({super.key, this.step = 'checkout'});
  final String step;
  @override
  Widget build(BuildContext context) {
    final items = step == 'address'
        ? ['add_address', 'business_profile']
        : step == 'payment'
        ? ['payment_upi', 'payment_card', 'payment_cod']
        : ['delivery_address', 'payment', 'review_order'];
    return Scaffold(
      appBar: AppBar(title: Text(tr(step))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ...items.map(
            (x) => Card(
              child: RadioListTile<String>(
                value: x,
                groupValue: items.first,
                onChanged: (_) {},
                title: Text(tr(x)),
                subtitle: Text(tr('brand_story')),
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(18),
              child: Column(
                children: [
                  _SummaryRow('subtotal', '₹7,284'),
                  _SummaryRow('gst', '₹1,311'),
                  _SummaryRow('total', '₹8,595', strong: true),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: FilledButton(
            onPressed: () => Navigator.pushNamed(
              context,
              step == 'checkout'
                  ? '/address'
                  : step == 'address'
                  ? '/payment'
                  : '/order-success',
            ),
            child: Text(tr(step == 'payment' ? 'place_order' : 'continue')),
          ),
        ),
      ),
    );
  }
}

class OrderSuccessScreen extends StatelessWidget {
  const OrderSuccessScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircleAvatar(
                radius: 46,
                backgroundColor: Color(0x2216A34A),
                child: Icon(
                  Icons.check_rounded,
                  size: 56,
                  color: BeautyColors.success,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                tr('order_success'),
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 10),
              Text(tr('order_success_body'), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/orders',
                  (_) => false,
                ),
                child: Text(tr('track_order')),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr('orders'))),
    body: ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (_, i) => Card(
        child: ListTile(
          onTap: () => Navigator.pushNamed(context, '/order-details'),
          leading: CircleAvatar(
            backgroundColor: BeautyColors.secondary.withValues(alpha: .4),
            child: const Icon(
              Icons.inventory_2_outlined,
              color: BeautyColors.primary,
            ),
          ),
          title: Text(
            '#VL-240${i + 1}',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          subtitle: Text('${12 + i} ${tr('units')} · ₹${(i + 2) * 2480}'),
          trailing: const Icon(Icons.chevron_right),
        ),
      ),
    ),
    bottomNavigationBar: const AppBottomNav(index: 3),
  );
}

class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr('order_details'))),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '#VL-2401',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 14),
                ...['order_success', 'payment', 'shipping', 'delivery'].map(
                  (x) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(
                      backgroundColor: Color(0x2216A34A),
                      child: Icon(Icons.check, color: BeautyColors.success),
                    ),
                    title: Text(tr(x)),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: () => Navigator.pushNamed(context, '/return'),
          child: Text(tr('return_request')),
        ),
      ],
    ),
  );
}

class ReturnScreen extends StatelessWidget {
  const ReturnScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr('return_request'))),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        DropdownButtonFormField<String>(
          items: [
            tr('reason'),
            tr('product_details'),
          ].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),
          onChanged: (_) {},
          decoration: InputDecoration(labelText: tr('reason')),
        ),
        const SizedBox(height: 16),
        TextField(
          maxLines: 5,
          decoration: InputDecoration(labelText: tr('product_details')),
        ),
        const SizedBox(height: 22),
        FilledButton(
          onPressed: () => showBeautySnack(context, 'submit_request'),
          child: Text(tr('submit_request')),
        ),
      ],
    ),
  );
}

class WishlistScreen extends StatelessWidget {
  const WishlistScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr('wishlist'))),
    body: const SingleChildScrollView(
      child: Column(children: [ProductGrid(), SizedBox(height: 24)]),
    ),
  );
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr('notifications'))),
    body: ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (_, i) => Card(
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: BeautyColors.secondary.withValues(alpha: .4),
            child: Icon(
              i.isEven ? Icons.local_offer : Icons.local_shipping,
              color: BeautyColors.primary,
            ),
          ),
          title: Text(tr(i.isEven ? 'limited_time' : 'delivery')),
          subtitle: Text(tr('brand_story')),
        ),
      ),
    ),
  );
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(tr('profile')),
      actions: [
        TextButton(
          onPressed: AppStrings.instance.toggle,
          child: Text(AppStrings.instance.locale.languageCode.toUpperCase()),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const CircleAvatar(
          radius: 44,
          backgroundColor: BeautyColors.secondary,
          child: Icon(
            Icons.storefront_rounded,
            size: 42,
            color: BeautyColors.primary,
          ),
        ),
        const SizedBox(height: 12),
        Center(
          child: Text(
            tr('business_profile'),
            style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
          ),
        ),
        const SizedBox(height: 24),
        ...[
          'business_profile',
          'address',
          'payment_methods',
          'settings',
          'support',
          'logout',
        ].map(
          (x) => Card(
            child: ListTile(
              onTap: () => Navigator.pushNamed(
                context,
                x == 'settings'
                    ? '/settings'
                    : x == 'support'
                    ? '/support'
                    : '/profile',
              ),
              title: Text(tr(x)),
              trailing: const Icon(Icons.chevron_right),
            ),
          ),
        ),
      ],
    ),
    bottomNavigationBar: const AppBottomNav(index: 4),
  );
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr('settings'))),
    body: ListView(
      children: [
        SwitchListTile(
          value: true,
          onChanged: (_) {},
          title: Text(tr('notifications')),
        ),
        ListTile(
          onTap: AppStrings.instance.toggle,
          title: Text(tr('language')),
          subtitle: Text(AppStrings.instance.locale.languageCode.toUpperCase()),
          trailing: const Icon(Icons.translate),
        ),
        ListTile(
          title: Text(tr('privacy')),
          trailing: const Icon(Icons.chevron_right),
        ),
        ListTile(
          title: Text(tr('appearance')),
          trailing: const Icon(Icons.chevron_right),
        ),
      ],
    ),
  );
}

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr('support'))),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ...['support', 'delivery', 'returns', 'payment'].map(
          (x) => Card(
            child: ListTile(
              leading: const Icon(
                Icons.help_outline,
                color: BeautyColors.primary,
              ),
              title: Text(tr(x)),
              subtitle: Text(tr('brand_story')),
            ),
          ),
        ),
        const SizedBox(height: 18),
        FilledButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.chat_bubble_outline),
          label: Text(tr('support')),
        ),
      ],
    ),
  );
}
