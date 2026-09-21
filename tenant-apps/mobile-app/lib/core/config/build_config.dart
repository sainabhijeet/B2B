import 'dart:convert';

import 'package:flutter/foundation.dart';

class BuildConfig {
  static const tenantCode =
      String.fromEnvironment('TENANT', defaultValue: 'default');
  static const apiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: '');
  static const appName = String.fromEnvironment('APP_NAME', defaultValue: '');
  static const appNameBase64 =
      String.fromEnvironment('APP_NAME_B64', defaultValue: '');
  static const appLanguage =
      String.fromEnvironment('APP_LANGUAGE', defaultValue: 'en');
  static const themeId = String.fromEnvironment('THEME_ID', defaultValue: '');
  static const languageConsistencyEnabled =
      bool.fromEnvironment('LANGUAGE_CONSISTENCY_ENABLED', defaultValue: false);
  static const allowInsecureHttp =
      bool.fromEnvironment('ALLOW_INSECURE_HTTP', defaultValue: false);

  static String _webParam(String key) {
    if (!kIsWeb) return '';
    try {
      return Uri.base.queryParameters[key]?.trim() ?? '';
    } catch (_) {
      return '';
    }
  }

  static String get resolvedTenantCode {
    final v = _webParam('tenant');
    return v.isNotEmpty ? v : tenantCode.trim();
  }

  static String get resolvedApiBaseUrl {
    final v = _webParam('apiBaseUrl');
    return v.isNotEmpty ? v : apiBaseUrl.trim();
  }

  static String get resolvedAppLanguage {
    final v = _webParam('appLanguage');
    return v.isNotEmpty ? v : appLanguage.trim();
  }

  static String get previewAppLanguageOverride {
    return _webParam('appLanguage');
  }

  static String get resolvedThemeId {
    final v = _webParam('themeId');
    return v.isNotEmpty ? v : themeId.trim();
  }

  /// Preview-only editor state passed by the Distributor Theme Editor.
  /// Production app launches do not include this query parameter.
  static Map<String, dynamic> get resolvedPreviewState {
    final raw = _webParam('previewState');
    if (raw.isEmpty) return <String, dynamic>{};
    try {
      final decoded = Uri.decodeComponent(raw);
      final value = jsonDecode(decoded);
      return value is Map ? value.cast<String, dynamic>() : <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  static String get resolvedAppName {
    final webName = _webParam('appName');
    if (webName.isNotEmpty) return webName;
    final webEncoded = _webParam('appNameB64');
    if (webEncoded.isNotEmpty) {
      try {
        return utf8.decode(base64.decode(webEncoded)).trim();
      } catch (_) {
        return '';
      }
    }
    final encoded = appNameBase64.trim();
    if (encoded.isNotEmpty) {
      try {
        return utf8.decode(base64.decode(encoded)).trim();
      } catch (_) {
        return '';
      }
    }
    return appName.trim();
  }

  /// Same header as storefront-web `storefrontHostHeader()` → Nest `TenantResolver`.
  /// Example: `acme.localhost:5175` (must match a tenant subdomain / domain mapping).
  static const storefrontHost =
      String.fromEnvironment('STOREFRONT_HOST', defaultValue: '');

  static String get resolvedStorefrontHost {
    final v = _webParam('storefrontHost');
    return v.isNotEmpty ? v : storefrontHost.trim();
  }

  /// Optional explicit tenant UUID (`X-Tenant-Id`) when you are not using storefront host mapping.
  static const tenantId = String.fromEnvironment(
    'TENANT_ID',
    defaultValue: '',
  );

  /// Dev convenience alias for [tenantId] (same header: `X-Tenant-Id`).
  static const devTenantId =
      String.fromEnvironment('DEV_TENANT_ID', defaultValue: '');

  static String get resolvedTenantUuid {
    final webTenantId = _webParam('tenantId');
    if (webTenantId.isNotEmpty) return webTenantId;
    final a = tenantId.trim();
    if (a.isNotEmpty) return a;
    return devTenantId.trim();
  }

  static const otpAutoVerifyAfterRequest = bool.fromEnvironment(
    'OTP_AUTO_VERIFY_AFTER_REQUEST',
    defaultValue: false,
  );
  static const developmentLoginPhone = String.fromEnvironment(
    'OTP_DEVELOPMENT_LOGIN_PHONE',
    defaultValue: '',
  );

  static void validateForLaunch() {
    if (!kReleaseMode) return;
    final error = launchConfigurationError(
      apiBaseUrl: resolvedApiBaseUrl,
      tenantUuid: resolvedTenantUuid,
      storefrontHost: resolvedStorefrontHost,
      allowInsecureHttp: allowInsecureHttp,
    );
    if (error != null) throw StateError(error);
  }

  @visibleForTesting
  static String? launchConfigurationError({
    required String apiBaseUrl,
    required String tenantUuid,
    required String storefrontHost,
    required bool allowInsecureHttp,
  }) {
    final api = Uri.tryParse(apiBaseUrl.trim());
    final secure = api != null && api.scheme == 'https' && api.host.isNotEmpty;
    final permittedLocalHttp = allowInsecureHttp &&
        api != null &&
        api.scheme == 'http' &&
        api.host.isNotEmpty;
    if (!secure && !permittedLocalHttp) {
      return 'A valid HTTPS API_BASE_URL is required for release builds.';
    }
    if (tenantUuid.trim().isEmpty && storefrontHost.trim().isEmpty) {
      return 'TENANT_ID or STOREFRONT_HOST is required for release builds.';
    }
    return null;
  }

  /// Shown in Auth / Settings for debugging tenant resolution (must match storefront).
  static String tenantResolutionSummary() {
    final parts = <String>[
      'TENANT=$resolvedTenantCode',
    ];
    if (resolvedThemeId.isNotEmpty) {
      parts.add('THEME_ID');
    }
    if (resolvedTenantUuid.isNotEmpty) {
      parts.add('X-Tenant-Id (TENANT_ID or DEV_TENANT_ID)');
    } else if (resolvedStorefrontHost.isNotEmpty) {
      parts.add('X-Storefront-Host from STOREFRONT_HOST');
    } else if (resolvedTenantCode != 'default') {
      parts.add('X-Storefront-Host=$resolvedTenantCode.localhost:5175');
    } else {
      parts.add(
        'debug: X-Storefront-Host from DEBUG_STOREFRONT_HOST (default abc-traders.localhost:5175; run backend `npm run tenants:seed`) — or TENANT_ID / STOREFRONT_HOST / TENANT=<slug>',
      );
    }
    return parts.join(' · ');
  }
}
