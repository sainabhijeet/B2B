import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../l10n/app_strings.dart';
import '../theme/beauty_theme.dart';

String tr(String key) => AppStrings.instance.t(key);

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.keyName, {super.key, this.action = true});
  final String keyName;
  final bool action;
  @override
  Widget build(BuildContext c) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
    child: Row(
      children: [
        Expanded(
          child: Text(
            tr(keyName),
            style: Theme.of(
              c,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
        ),
        if (action) TextButton(onPressed: () {}, child: Text(tr('view_all'))),
      ],
    ),
  );
}

class BeautySearchBar extends StatelessWidget {
  const BeautySearchBar({super.key});
  @override
  Widget build(BuildContext c) => Padding(
    padding: const EdgeInsets.all(16),
    child: TextField(
      decoration: InputDecoration(
        prefixIcon: const Icon(Icons.search_rounded),
        hintText: tr('search'),
        suffixIcon: const Icon(Icons.tune_rounded),
      ),
    ),
  );
}

class StockBadge extends StatelessWidget {
  const StockBadge({super.key, this.low = false});
  final bool low;
  @override
  Widget build(BuildContext c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(
      color: (low ? Colors.orange : BeautyColors.success).withValues(alpha: .1),
      borderRadius: BorderRadius.circular(99),
    ),
    child: Text(
      tr(low ? 'low_stock' : 'in_stock'),
      style: TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w800,
        color: low ? Colors.orange : BeautyColors.success,
      ),
    ),
  );
}

class RatingView extends StatelessWidget {
  const RatingView({super.key});
  @override
  Widget build(BuildContext c) => const Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(Icons.star_rounded, size: 16, color: Colors.amber),
      Text(
        ' 4.8 (126)',
        style: TextStyle(fontSize: 11, color: BeautyColors.muted),
      ),
    ],
  );
}

class QuantityStepper extends StatefulWidget {
  const QuantityStepper({super.key});
  @override
  State<QuantityStepper> createState() => _QuantityStepperState();
}

class _QuantityStepperState extends State<QuantityStepper> {
  int v = 1;
  @override
  Widget build(BuildContext c) => Container(
    decoration: BoxDecoration(
      border: Border.all(color: BeautyColors.border),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          onPressed: v > 1 ? () => setState(() => v--) : null,
          icon: const Icon(Icons.remove, size: 18),
        ),
        Text('$v', style: const TextStyle(fontWeight: FontWeight.w800)),
        IconButton(
          onPressed: () => setState(() => v++),
          icon: const Icon(Icons.add, size: 18),
        ),
      ],
    ),
  );
}

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.index});
  final int index;
  static const ids = [
    'radiance-serum',
    'velvet-lip',
    'repair-mask',
    'oud-mist',
    'sun-fluid',
    'cleanser',
    'scalp-serum',
    'baby-lotion',
  ];
  static const names = [
    'Radiance Barrier Serum',
    'Velvet Matte Lip Color',
    'Bond Repair Hair Mask',
    'Velvet Oud Body Mist',
    'Daily Shield SPF 50',
    'Cloud Cream Cleanser',
    'Root Revival Scalp Serum',
    'Gentle Baby Lotion',
  ];
  @override
  Widget build(BuildContext c) {
    final i = index % ids.length;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.pushNamed(c, '/product'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: SvgPicture.asset(
                      'assets/images/product-${ids[i]}.svg',
                      fit: BoxFit.cover,
                    ),
                  ),
                  const Positioned(top: 10, left: 10, child: StockBadge()),
                  const Positioned(
                    top: 4,
                    right: 4,
                    child: IconButton(
                      onPressed: null,
                      icon: Icon(
                        Icons.favorite_border_rounded,
                        color: BeautyColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'LUMERA PRO',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: BeautyColors.primary,
                      letterSpacing: 1,
                    ),
                  ),
                  Text(
                    names[i],
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const RatingView(),
                  const SizedBox(height: 5),
                  Text(
                    '₹${286 + i * 44}',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    '${tr('min_order')}: ${6 + (i % 3) * 6} ${tr('units')}',
                    style: const TextStyle(
                      fontSize: 10,
                      color: BeautyColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ProductGrid extends StatelessWidget {
  const ProductGrid({super.key, this.count = 8});
  final int count;
  @override
  Widget build(BuildContext c) => GridView.builder(
    padding: const EdgeInsets.symmetric(horizontal: 16),
    physics: const NeverScrollableScrollPhysics(),
    shrinkWrap: true,
    itemCount: count,
    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: MediaQuery.sizeOf(c).width > 700 ? 4 : 2,
      childAspectRatio: .58,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
    ),
    itemBuilder: (_, i) => ProductCard(index: i),
  );
}

class CategoryTile extends StatelessWidget {
  const CategoryTile({super.key, required this.id, required this.label});
  final String id, label;
  @override
  Widget build(BuildContext c) => Card(
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: () => Navigator.pushNamed(c, '/product-list'),
      child: Column(
        children: [
          Expanded(
            child: SvgPicture.asset(
              'assets/images/category-$id.svg',
              fit: BoxFit.cover,
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Text(
              tr(label),
              maxLines: 1,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    ),
  );
}

class BrandCard extends StatelessWidget {
  const BrandCard({super.key, required this.label});
  final String label;
  @override
  Widget build(BuildContext c) => Card(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Center(
        child: Text(
          label,
          style: Theme.of(c).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
            color: BeautyColors.primary,
          ),
        ),
      ),
    ),
  );
}

class OfferCard extends StatelessWidget {
  const OfferCard({super.key, required this.titleKey, required this.banner});
  final String titleKey, banner;
  @override
  Widget build(BuildContext c) => Card(
    clipBehavior: Clip.antiAlias,
    child: Stack(
      alignment: Alignment.bottomLeft,
      children: [
        Image.asset(
          'assets/banners/$banner-1200x628.png',
          height: 180,
          width: double.infinity,
          fit: BoxFit.cover,
        ),
        Container(
          height: 180,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.black54, Colors.transparent],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            tr(titleKey),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    ),
  );
}

class PriceBadge extends StatelessWidget {
  const PriceBadge(this.value, {super.key});
  final String value;
  @override
  Widget build(BuildContext c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: BeautyColors.primary,
      borderRadius: BorderRadius.circular(99),
    ),
    child: Text(
      value,
      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
    ),
  );
}

class CouponCard extends StatelessWidget {
  const CouponCard({super.key});
  @override
  Widget build(BuildContext c) => Card(
    child: ListTile(
      leading: const Icon(
        Icons.confirmation_number_outlined,
        color: BeautyColors.primary,
      ),
      title: Text(tr('coupon')),
      trailing: TextButton(onPressed: () {}, child: Text(tr('apply'))),
    ),
  );
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.titleKey, required this.icon});
  final String titleKey;
  final IconData icon;
  @override
  Widget build(BuildContext c) => Center(
    child: Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 74, color: BeautyColors.secondary),
          const SizedBox(height: 18),
          Text(
            tr(titleKey),
            textAlign: TextAlign.center,
            style: Theme.of(c).textTheme.titleLarge,
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: () =>
                Navigator.pushNamedAndRemoveUntil(c, '/home', (_) => false),
            child: Text(tr('shop_now')),
          ),
        ],
      ),
    ),
  );
}

class LoadingSkeleton extends StatelessWidget {
  const LoadingSkeleton({super.key});
  @override
  Widget build(BuildContext c) => ListView.builder(
    itemCount: 6,
    itemBuilder: (_, __) => Container(
      height: 96,
      margin: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: BeautyColors.secondary.withValues(alpha: .25),
        borderRadius: BorderRadius.circular(16),
      ),
    ),
  );
}

class BeautyShimmer extends StatefulWidget {
  const BeautyShimmer({super.key, required this.child});
  final Widget child;
  @override
  State<BeautyShimmer> createState() => _BeautyShimmerState();
}

class _BeautyShimmerState extends State<BeautyShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat();
  @override
  void dispose() {
    c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: Tween(
      begin: .35,
      end: .85,
    ).animate(CurvedAnimation(parent: c, curve: Curves.easeInOut)),
    child: widget.child,
  );
}

void showBeautySnack(BuildContext c, String key) =>
    ScaffoldMessenger.of(c).showSnackBar(
      SnackBar(content: Text(tr(key)), behavior: SnackBarBehavior.floating),
    );
Future<bool?> showBeautyDialog(BuildContext c) => showDialog<bool>(
  context: c,
  builder: (_) => AlertDialog(
    title: Text(tr('order_summary')),
    content: Text(tr('review_order')),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(c, false),
        child: Text(tr('cancel')),
      ),
      FilledButton(
        onPressed: () => Navigator.pop(c, true),
        child: Text(tr('continue')),
      ),
    ],
  ),
);
