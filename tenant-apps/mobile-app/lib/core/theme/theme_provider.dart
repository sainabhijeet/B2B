import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../config/build_config.dart';
import '../config/user_app_settings_provider.dart';
import 'theme_model.dart';
import 'theme_service.dart';

const _kThemePrefsKey = 'storefront_theme_json_v1';

String _themePrefsKey(String language) {
  final tenant = BuildConfig.resolvedTenantUuid.trim().isNotEmpty
      ? BuildConfig.resolvedTenantUuid.trim()
      : BuildConfig.resolvedTenantCode.trim();
  final theme = BuildConfig.resolvedThemeId.trim().isNotEmpty
      ? BuildConfig.resolvedThemeId.trim()
      : 'runtime';
  return '$_kThemePrefsKey:$tenant:$theme:$language';
}

final themeServiceProvider = Provider<ThemeService>((ref) {
  return ThemeService(ref.watch(apiClientProvider));
});

final themeProvider =
    NotifierProvider<StorefrontThemeController, StorefrontTheme>(
  StorefrontThemeController.new,
);

/// Loads cached theme then `GET /storefront/theme`; [setTheme] for overrides.
class StorefrontThemeController extends Notifier<StorefrontTheme> {
  var _initialHydrateScheduled = false;
  var _hydrateRevision = 0;

  @override
  StorefrontTheme build() {
    ref.listen<String>(
      userAppSettingsProvider.select(
        (UserAppSettings settings) => settings.languageCode,
      ),
      (String? previous, String next) {
        if (previous != null && previous != next) {
          unawaited(_hydrate(next));
        }
      },
    );
    return StorefrontTheme.empty;
  }

  /// Idempotent: run after storefront tenant context exists ([storefrontAppConfigProvider] has data).
  void scheduleHydrateFromStorefront() {
    if (_initialHydrateScheduled) return;
    _initialHydrateScheduled = true;
    final String language = ref.read(userAppSettingsProvider).languageCode;
    unawaited(_hydrate(language));
  }

  Future<void> refreshFromStorefront() {
    final String language = ref.read(userAppSettingsProvider).languageCode;
    return _hydrate(language);
  }

  Future<void> _hydrate(String language) async {
    final int revision = ++_hydrateRevision;
    final service = ref.read(themeServiceProvider);
    final bundledTheme = (await service.loadBundledTheme(language: language))
        .withPreviewOverrides(BuildConfig.resolvedPreviewState);
    if (!_isCurrentHydration(revision, language)) return;
    state = bundledTheme;

    final prefs = await SharedPreferences.getInstance();
    final cacheKey = _themePrefsKey(language);
    final cached = prefs.getString(cacheKey);
    if (cached != null && cached.isNotEmpty) {
      try {
        final map = jsonDecode(cached) as Map<String, dynamic>;
        final cachedTheme = await service.withBundledLocale(
          StorefrontTheme.fromJson(map),
          language: language,
        );
        if (!_isCurrentHydration(revision, language)) return;
        state = cachedTheme;
      } catch (_) {}
    }
    final t = (await service.fetchStorefrontTheme(
      language: language,
      fallback: state,
    ))
        .withPreviewOverrides(BuildConfig.resolvedPreviewState);
    if (!_isCurrentHydration(revision, language)) return;
    state = t;
    try {
      await prefs.setString(
        cacheKey,
        jsonEncode(t.toJson()),
      );
    } catch (_) {}
  }

  bool _isCurrentHydration(int revision, String language) {
    return revision == _hydrateRevision &&
        ref.read(userAppSettingsProvider).languageCode == language;
  }

  void setTheme(StorefrontTheme theme) {
    state = theme;
  }
}
