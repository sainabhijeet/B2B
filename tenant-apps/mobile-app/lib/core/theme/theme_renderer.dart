import 'package:flutter/material.dart';

import '../../features/home/layouts/layouts.dart';
import '../config/storefront_app_config.dart';
import 'theme_model.dart';

class ThemeRenderer extends StatelessWidget {
  const ThemeRenderer({
    super.key,
    required this.theme,
    this.appConfig,
  });

  final StorefrontTheme theme;
  final StorefrontAppConfig? appConfig;

  String get _effectiveLayout => theme.baseLayout.toLowerCase();

  bool get _effectiveBanner {
    final cfgOn = appConfig?.showBanner ?? true;
    return cfgOn && theme.showBanner;
  }

  @override
  Widget build(BuildContext context) {
    switch (_effectiveLayout) {
      case 'list':
        return ListLayout(theme: theme, showBanner: _effectiveBanner);
      case 'fast_order':
        return FastOrderLayout(theme: theme, showBanner: _effectiveBanner);
      case 'grid':
      default:
        return GridLayout(theme: theme, showBanner: _effectiveBanner);
    }
  }
}
