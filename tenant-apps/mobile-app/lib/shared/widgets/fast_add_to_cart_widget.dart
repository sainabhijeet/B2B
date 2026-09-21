import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/language_provider.dart';

/// Primary “add to cart” affordance for B2B / fast flows.
class FastAddToCartWidget extends ConsumerWidget {
  const FastAddToCartWidget({
    super.key,
    required this.onPressed,
    this.label = 'Add',
    this.enabled = true,
  });

  final VoidCallback? onPressed;
  final String label;
  final bool enabled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    return FilledButton.tonalIcon(
      onPressed: enabled ? onPressed : null,
      style: FilledButton.styleFrom(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      icon: const Icon(Icons.add_shopping_cart, size: 20),
      label: Text(t(label)),
    );
  }
}
