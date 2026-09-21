import 'package:flutter/material.dart';

import '../../mock_data/mock_data.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../widgets/common/app_asset_image.dart';
import '../../widgets/common/primary_search_bar.dart';
import '../../widgets/common/section_header.dart';
import '../../widgets/product/product_card.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const customer = MockData.customer;
    return SafeArea(
      child: CustomScrollView(
        slivers: <Widget>[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text('Good Morning, ${customer.company}', style: Theme.of(context).textTheme.titleLarge),
                            const SizedBox(height: 4),
                            Row(
                              children: <Widget>[
                                const Icon(Icons.location_on_outlined, size: 16, color: AppColors.textSecondary),
                                const SizedBox(width: 4),
                                Text('${customer.city} | ${customer.pincode}'),
                              ],
                            ),
                          ],
                        ),
                      ),
                      IconButton.filledTonal(
                        onPressed: () {},
                        icon: const Icon(Icons.notifications_none_rounded),
                      ),
                      const SizedBox(width: 6),
                      IconButton.filled(
                        onPressed: () {},
                        icon: const Icon(Icons.person_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const PrimarySearchBar(),
                  const SizedBox(height: 18),
                  SizedBox(
                    height: 166,
                    child: PageView.builder(
                      controller: PageController(viewportFraction: 0.92),
                      itemCount: MockData.banners.length,
                      itemBuilder: (_, index) {
                        final banner = MockData.banners[index];
                        return Container(
                          margin: const EdgeInsets.only(right: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(AppRadius.xl),
                          ),
                          child: Row(
                            children: <Widget>[
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: <Widget>[
                                    Text(
                                      banner.title,
                                      style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      banner.subtitle,
                                      style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(height: 12),
                                    FilledButton.tonal(
                                      onPressed: () {},
                                      child: Text(banner.cta),
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(width: 112, child: AppAssetImage(asset: banner.asset)),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: AppSpacing.section),
                  const SectionHeader(title: 'Shop by Category', action: 'View all'),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 118,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: MockData.categories.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (_, index) {
                        final category = MockData.categories[index];
                        return SizedBox(
                          width: 96,
                          child: Card(
                            margin: EdgeInsets.zero,
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: Column(
                                children: <Widget>[
                                  Expanded(child: AppAssetImage(asset: category.asset)),
                                  Text(category.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900)),
                                  Text('${category.count} items', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: AppSpacing.section),
                  const SectionHeader(title: 'Recommended Products', action: 'See all'),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverGrid.builder(
              itemCount: MockData.products.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.62,
              ),
              itemBuilder: (_, index) => ProductCard(
                product: MockData.products[index],
                onAdd: () => ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('${MockData.products[index].name} added')),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const SectionHeader(title: 'Best Deals for Your Business'),
                  const SizedBox(height: 12),
                  Row(
                    children: MockData.products.take(2).map((product) {
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 10),
                          child: ProductCard(product: product, compact: true),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  const SectionHeader(title: 'Recently Ordered'),
                  const SizedBox(height: 10),
                  ...MockData.products.take(3).map(
                    (product) => Card(
                      child: ListTile(
                        leading: AppAssetImage(asset: product.asset, width: 44, height: 44),
                        title: Text(product.name),
                        subtitle: Text(product.packSize),
                        trailing: FilledButton.tonal(onPressed: () {}, child: const Text('Buy Again')),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
