import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/component_registry.dart';
import '../../../core/theme/theme_model.dart';

class GridLayout extends ConsumerWidget {
  const GridLayout({super.key, required this.theme, required this.showBanner});
  final StorefrontTheme theme;
  final bool showBanner;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reg = ThemeComponentRegistry.map();
    return ListView(
      children: <Widget>[
        if (showBanner) reg['banner']!(context, ref),
        reg['categories']!(context, ref),
        reg['products_grid']!(context, ref),
        reg['cart_summary']!(context, ref),
      ],
    );
  }
}

class ListLayout extends ConsumerWidget {
  const ListLayout({super.key, required this.theme, required this.showBanner});
  final StorefrontTheme theme;
  final bool showBanner;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reg = ThemeComponentRegistry.map();
    return ListView(
      children: <Widget>[
        if (showBanner) reg['banner']!(context, ref),
        reg['categories']!(context, ref),
        reg['products_list']!(context, ref),
        reg['cart_summary']!(context, ref),
      ],
    );
  }
}

class FastOrderLayout extends ConsumerWidget {
  const FastOrderLayout({super.key, required this.theme, required this.showBanner});
  final StorefrontTheme theme;
  final bool showBanner;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reg = ThemeComponentRegistry.map();
    return ListView(
      children: <Widget>[
        if (showBanner) reg['banner']!(context, ref),
        reg['products_list']!(context, ref),
        reg['cart_summary']!(context, ref),
      ],
    );
  }
}
