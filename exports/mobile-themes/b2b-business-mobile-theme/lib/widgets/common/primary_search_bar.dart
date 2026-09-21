import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';

class PrimarySearchBar extends StatelessWidget {
  const PrimarySearchBar({super.key, this.value = '', this.onClear});

  final String value;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 54,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Row(
        children: <Widget>[
          const Icon(Icons.search_rounded, color: AppColors.textSecondary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              value.isEmpty ? 'Search products, brands or categories' : value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          IconButton(
            tooltip: value.isEmpty ? 'Voice search' : 'Clear',
            onPressed: onClear,
            icon: Icon(value.isEmpty ? Icons.mic_none_rounded : Icons.close_rounded),
          ),
        ],
      ),
    );
  }
}
