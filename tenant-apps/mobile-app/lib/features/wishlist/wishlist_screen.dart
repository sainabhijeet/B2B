import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/language_provider.dart';
import '../../shared/models/models.dart';
import '../products/product_detail_screen.dart';
import 'wishlist_provider.dart';

class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<Product>> wishlist = ref.watch(wishlistProvider);
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final ColorScheme colorScheme = Theme.of(context).colorScheme;

    return wishlist.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (Object error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(Icons.favorite_border, size: 52, color: colorScheme.error),
              const SizedBox(height: 12),
              Text(
                '$error',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              FilledButton.tonal(
                onPressed: () => ref.read(wishlistProvider.notifier).refresh(),
                child: Text(t('Retry')),
              ),
            ],
          ),
        ),
      ),
      data: (List<Product> products) {
        if (products.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Icon(
                    Icons.favorite_border,
                    size: 52,
                    color: colorScheme.primary,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    t('No wishlist products yet.'),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ],
              ),
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: products.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (BuildContext context, int index) {
            final Product product = products[index];
            final String price = product.price == null
                ? t('Price on request')
                : localization.formatCurrency(product.price!);
            return Card(
              margin: EdgeInsets.zero,
              clipBehavior: Clip.antiAlias,
              child: ListTile(
                contentPadding: const EdgeInsets.all(10),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => ProductDetailScreen(product: product),
                  ),
                ),
                leading: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: _WishlistImage(url: product.imageUrl ?? ''),
                ),
                title: Text(
                  t(product.name),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text(price),
                trailing: IconButton(
                  tooltip: t('Remove'),
                  icon: const Icon(Icons.favorite),
                  color: Colors.red,
                  onPressed: () async {
                    try {
                      await ref.read(wishlistProvider.notifier).toggle(product);
                    } catch (error) {
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('$error')),
                      );
                    }
                  },
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _WishlistImage extends StatelessWidget {
  const _WishlistImage({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    final String clean = url.trim();
    final Widget fallback = ColoredBox(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: const SizedBox(
        width: 64,
        height: 64,
        child: Icon(Icons.image_outlined),
      ),
    );
    if (clean.isEmpty) return fallback;
    if (clean.startsWith('assets/')) {
      return Image.asset(
        clean,
        width: 64,
        height: 64,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback,
      );
    }
    return Image.network(
      clean,
      width: 64,
      height: 64,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback,
    );
  }
}
