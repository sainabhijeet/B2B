import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ridego/core/localization/language_provider.dart';
import 'package:ridego/shared/models/models.dart';

class GroceryAssetImage extends StatelessWidget {
  const GroceryAssetImage({super.key, required this.url, this.fit = BoxFit.cover, this.icon = Icons.inventory_2_outlined});

  final String? url;
  final BoxFit fit;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final clean = url?.trim() ?? '';
    final fallback = ColoredBox(
      color: colors.surfaceContainerHighest,
      child: Center(child: Icon(icon, color: colors.primary, size: 30)),
    );
    if (clean.isEmpty) return fallback;
    if (clean.startsWith('assets/')) {
      return Image.asset(clean, fit: fit, width: double.infinity, height: double.infinity, errorBuilder: (_, __, ___) => fallback);
    }
    return Image.network(clean, fit: fit, width: double.infinity, height: double.infinity, errorBuilder: (_, __, ___) => fallback);
  }
}

class GrocerySectionHeader extends ConsumerWidget {
  const GrocerySectionHeader({super.key, required this.title, this.subtitle, this.actionLabel, this.onAction});

  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final colors = Theme.of(context).colorScheme;
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t(title), maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
              if (subtitle != null) Text(t(subtitle!), maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
        if (actionLabel != null)
          TextButton(onPressed: onAction, child: Text(t(actionLabel!), maxLines: 1, overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}

class GroceryProductCard extends ConsumerWidget {
  const GroceryProductCard({super.key, required this.product, this.onTap, this.onAdd});

  final Product product;
  final VoidCallback? onTap;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final colors = Theme.of(context).colorScheme;
    final price = product.price == null ? t('Price on request') : '₹${product.price!.toStringAsFixed(product.price! % 1 == 0 ? 0 : 2)}';
    return Material(
      color: colors.surface,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: colors.outlineVariant)),
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  children: [
                    Positioned.fill(child: ClipRRect(borderRadius: BorderRadius.circular(8), child: GroceryAssetImage(url: product.imageUrl))),
                    Positioned(top: 7, left: 7, child: _MiniBadge(label: '${t('MOQ')} ${product.moq}')),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(product.brand ?? t('Wholesale'), maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colors.primary, fontWeight: FontWeight.w900)),
              const SizedBox(height: 3),
              Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w900, height: 1.1)),
              const SizedBox(height: 5),
              Text([product.packSize, product.unit, product.sku].where((e) => (e ?? '').isNotEmpty).join(' • '), maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colors.onSurfaceVariant)),
              const SizedBox(height: 7),
              Row(
                children: [
                  Expanded(child: Text(price, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: colors.primary, fontWeight: FontWeight.w900))),
                  SizedBox.square(
                    dimension: 34,
                    child: IconButton.filled(
                      padding: EdgeInsets.zero,
                      iconSize: 18,
                      onPressed: onAdd,
                      icon: const Icon(Icons.add_shopping_cart_outlined),
                    ),
                  )
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  const _MiniBadge({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(color: colors.primary, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colors.onPrimary, fontWeight: FontWeight.w900)),
    );
  }
}
