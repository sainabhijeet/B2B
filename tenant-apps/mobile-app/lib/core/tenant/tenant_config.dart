import 'package:flutter/material.dart';

import '../config/build_config.dart';
import '../config/default_api_base.dart';

class TenantConfig {
  const TenantConfig({
    required this.appName,
    required this.primaryColor,
    required this.secondaryColor,
    required this.logoUrl,
    required this.apiBaseUrl,
    required this.themeCode,
    required this.languageCode,
  });

  final String appName;
  final Color primaryColor;
  final Color secondaryColor;
  final String logoUrl;
  final String apiBaseUrl;
  final String themeCode;
  final String languageCode;
}

class TenantRegistry {
  /// Android emulator: host `localhost` is the emulator itself → use `10.0.2.2` for Mac/PC host.
  /// iOS simulator: `localhost` reaches the host machine.
  static String _resolveApiBaseUrl(String fallback) {
    final fromDefine = BuildConfig.resolvedApiBaseUrl.trim();
    if (fromDefine.isNotEmpty) return fromDefine;
    return fallback;
  }

  static String _resolveAppName(String fallback) {
    final fromDefine = BuildConfig.resolvedAppName.trim();
    if (fromDefine.isNotEmpty) return fromDefine;
    return fallback;
  }

  static TenantConfig current() {
    return TenantConfig(
      appName: _resolveAppName('Glowora'),
      primaryColor: const Color(0xFF1565C0),
      secondaryColor: const Color(0xFF26A69A),
      logoUrl: '',
      apiBaseUrl: _resolveApiBaseUrl(defaultApiBaseForDevice()),
      themeCode: BuildConfig.resolvedThemeId.trim().isNotEmpty
          ? BuildConfig.resolvedThemeId.trim()
          : 'default',
      languageCode: BuildConfig.resolvedAppLanguage,
    );
  }
}
