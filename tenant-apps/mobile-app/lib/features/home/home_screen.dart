import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/theme_model.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/config/storefront_app_config_provider.dart';
import '../products/products_provider.dart';
import 'layouts/grid_home.dart';
import 'layouts/list_home.dart';
import 'layouts/template_home.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  Future<void> _refreshHome(WidgetRef ref) async {
    final Future<void> themeRefresh =
        ref.read(themeProvider.notifier).refreshFromStorefront();
    await Future.wait<Object?>(<Future<Object?>>[
      ref.refresh(storefrontAppConfigProvider.future),
      ref.refresh(categoriesProvider.future),
      ref.refresh(productsProvider.future),
      themeRefresh,
    ]);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final StorefrontTheme theme = ref.watch(themeProvider);
    final config = ref.watch(storefrontAppConfigProvider).asData?.value;
    final ColorScheme scheme = Theme.of(context).colorScheme;

    final Widget body = theme.hasHomeTemplate
        ? TemplateHome(theme: theme)
        : config?.defaultHomeLayout == 'list'
            ? ListHome(theme: theme)
            : GridHome(theme: theme);

    return Theme(
      data: Theme.of(context).copyWith(
        colorScheme: scheme,
      ),
      child: RefreshIndicator(
        onRefresh: () => _refreshHome(ref),
        child: body,
      ),
    );
  }
}
