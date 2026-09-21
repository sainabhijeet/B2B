import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/language_provider.dart';

/// Horizontal category chips — stateless; selection owned by parent.
class CategoryWidget extends ConsumerWidget {
  const CategoryWidget({
    super.key,
    required this.labels,
    required this.selected,
    this.onSelected,
  });

  final List<String> labels;
  final String selected;
  final ValueChanged<String>? onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    return SizedBox(
      height: 44,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: labels.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (BuildContext context, int i) {
          final String label = labels[i];
          final bool isSelected = label == selected;
          return FilterChip(
            label: Text(t(label)),
            selected: isSelected,
            onSelected: onSelected == null ? null : (_) => onSelected!(label),
          );
        },
      ),
    );
  }
}
