import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';

import '../api/nest_json.dart';
import '../config/build_config.dart';
import 'theme_model.dart';

class ThemeService {
  const ThemeService(this._dio);
  final Dio _dio;

  Future<StorefrontTheme> loadBundledTheme({String? language}) async {
    try {
      final raw = await rootBundle.loadString(
        'assets/theme/storefront_theme.json',
      );
      final decoded = jsonDecode(raw);
      if (decoded is Map) {
        return withBundledLocale(
          StorefrontTheme.fromJson(
            _withAbsoluteImageUrls(decoded.cast<String, dynamic>()),
          ),
          language: language,
        );
      }
    } catch (_) {
      // Production artifacts validate this file during the build.
    }
    return withBundledLocale(_fallback(), language: language);
  }

  /// Slim mobile bundle: `GET /storefront/theme` → `{ base_layout, config, branding }`.
  Future<StorefrontTheme> fetchStorefrontTheme({
    String? language,
    StorefrontTheme? fallback,
  }) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/storefront/theme',
        queryParameters: language?.trim().isNotEmpty == true
            ? <String, dynamic>{'language': language!.trim()}
            : null,
      );
      final raw = nestEnvelopeData(res.data);
      if (raw is Map<String, dynamic>) {
        return withBundledLocale(
          StorefrontTheme.fromJson(_withAbsoluteImageUrls(raw)),
          language: language,
        );
      }
    } catch (_) {
      /* fall through */
    }
    return fallback ?? withBundledLocale(_fallback(), language: language);
  }

  StorefrontTheme _fallback() {
    return StorefrontTheme.empty;
  }

  Future<StorefrontTheme> withBundledLocale(
    StorefrontTheme theme, {
    String? language,
  }) async {
    final raw = await _withBundledLocale(theme.toJson(), language: language);
    return StorefrontTheme.fromJson(raw);
  }

  Map<String, dynamic> _withAbsoluteImageUrls(Map<String, dynamic> raw) {
    final next = Map<String, dynamic>.from(raw);
    final config = Map<String, dynamic>.from(
      (next['config'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{},
    );
    for (final key in <String>[
      'preview_image',
      'banner_image',
      'category_image',
    ]) {
      final value = config[key];
      if (value is String) {
        config[key] = _absoluteStorageUrl(value);
      }
    }
    next['config'] = config;
    final preview = Map<String, dynamic>.from(
      (next['preview'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{},
    );
    final assetBaseUrl = preview['assetBaseUrl'];
    if (assetBaseUrl is String) {
      preview['assetBaseUrl'] = _absoluteStorageUrl(assetBaseUrl);
    }
    if (preview.isNotEmpty) {
      next['preview'] = preview;
    }
    return next;
  }

  String _absoluteStorageUrl(String raw) {
    final value = raw.trim();
    if (value.isEmpty ||
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('data:')) {
      return value;
    }
    if (!value.startsWith('/storage/') && !value.startsWith('storage/')) {
      return value;
    }
    final base = Uri.tryParse(_dio.options.baseUrl);
    if (base == null || !base.hasScheme || base.host.isEmpty) return value;
    final path = value.startsWith('/') ? value : '/$value';
    return '${base.origin}$path';
  }

  Future<Map<String, dynamic>> _withBundledLocale(
    Map<String, dynamic> raw, {
    String? language,
  }) async {
    final preview = Map<String, dynamic>.from(
      (raw['preview'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{},
    );
    final existingLocale = (preview['locale'] as Map?)?.map(
          (key, value) => MapEntry(key.toString(), value.toString()),
        ) ??
        const <String, String>{};

    final resolvedLanguage = language?.trim().isNotEmpty == true
        ? language!.trim().toLowerCase().split('-').first
        : BuildConfig.resolvedAppLanguage.trim().isNotEmpty
            ? BuildConfig.resolvedAppLanguage
                .trim()
                .toLowerCase()
                .split('-')
                .first
            : 'en';
    final englishStorefrontLocale = await _loadStorefrontLocale('en');
    final selectedStorefrontLocale = resolvedLanguage == 'en'
        ? null
        : await _loadStorefrontLocale(resolvedLanguage);
    final slug = (preview['slug'] ?? raw['theme_slug'] ?? raw['themeSlug'])
        ?.toString()
        .trim();
    final englishBundledLocale = slug == null || slug.isEmpty
        ? null
        : await _loadBundledLocale(slug, 'en');
    final selectedBundledLocale =
        slug == null || slug.isEmpty || resolvedLanguage == 'en'
            ? null
            : await _loadBundledLocale(slug, resolvedLanguage);
    if ((englishStorefrontLocale == null || englishStorefrontLocale.isEmpty) &&
        (selectedStorefrontLocale == null ||
            selectedStorefrontLocale.isEmpty) &&
        (englishBundledLocale == null || englishBundledLocale.isEmpty) &&
        (selectedBundledLocale == null || selectedBundledLocale.isEmpty) &&
        existingLocale.isEmpty) {
      return raw;
    }

    final next = Map<String, dynamic>.from(raw);
    preview['locale'] = <String, String>{
      if (englishStorefrontLocale != null) ...englishStorefrontLocale,
      if (selectedStorefrontLocale != null) ...selectedStorefrontLocale,
      if (englishBundledLocale != null) ...englishBundledLocale,
      ...existingLocale,
      if (selectedBundledLocale != null) ...selectedBundledLocale,
    };
    next['preview'] = preview;
    return next;
  }

  Future<Map<String, String>?> _loadStorefrontLocale(String language) async {
    final paths = <String>[
      'assets/localization/assets/locales/storefront/$language.json',
      'assets/localization/backend/storage/locales/$language.json',
      'assets/localization/storage/locales/$language.json',
      'assets/locales/storefront/$language.json',
    ];
    for (final path in paths) {
      try {
        final raw = await rootBundle.loadString(path);
        return _flattenLocale(jsonDecode(raw));
      } catch (_) {
        /* try the next packaged path */
      }
    }
    return null;
  }

  Future<Map<String, String>?> _loadBundledLocale(
    String slug,
    String language,
  ) async {
    final paths = <String>[
      'assets/localization/$language.json',
      'assets/localization/backend/storage/themes/mobile/$slug/locales/$language.json',
      'assets/localization/storage/themes/mobile/$slug/locales/$language.json',
      'assets/localization/mobile/$slug/locales/$language.json',
      'assets/localization/assets/locales/storefront/$language.json',
      'assets/localization/backend/storage/locales/$language.json',
      'assets/localization/storage/locales/$language.json',
      'assets/locales/storefront/$language.json',
    ];
    for (final path in paths) {
      try {
        final raw = await rootBundle.loadString(path);
        return _flattenLocale(jsonDecode(raw));
      } catch (_) {
        /* try the next packaged path */
      }
    }
    return null;
  }

  Map<String, String> _flattenLocale(Object? value, [String prefix = '']) {
    if (value is! Map) return const <String, String>{};
    final out = <String, String>{};
    value.forEach((key, child) {
      final nextKey = prefix.isEmpty ? key.toString() : '$prefix.$key';
      if (child is String) {
        out[nextKey] = child;
      } else if (child is Map) {
        out.addAll(_flattenLocale(child, nextKey));
      }
    });
    return out;
  }
}
