import 'package:flutter/material.dart';

Color _hexToColor(String? raw, Color fallback) {
  if (raw == null || raw.trim().isEmpty) return fallback;
  var hex = raw.trim().replaceFirst('#', '');
  if (hex.length == 6) hex = 'FF$hex';
  if (hex.length != 8) return fallback;
  try {
    return Color(int.parse(hex, radix: 16));
  } catch (_) {
    return fallback;
  }
}

class StorefrontTheme {
  const StorefrontTheme({
    this.themeId,
    this.themeSlug,
    this.themeName,
    required this.baseLayout,
    required this.config,
    required this.branding,
    this.preview,
  });

  final String? themeId;
  final String? themeSlug;
  final String? themeName;
  final String baseLayout;
  final Map<String, dynamic> config;
  final ThemeBranding branding;
  final ThemePreviewBundle? preview;

  static const empty = StorefrontTheme(
    baseLayout: '',
    config: <String, dynamic>{},
    branding: ThemeBranding(primaryColor: '', logo: ''),
  );

  /// `grid` | `list` | `fast_order` | `fast-order` (aliases normalized).
  String get normalizedLayout {
    return baseLayout.toLowerCase().replaceAll('-', '_');
  }

  // --- config keys (defaults if missing) ---------------------------------

  bool get showBanner {
    final v = config['show_banner'];
    if (v == null) return true;
    return v == true || v == 1 || v == '1' || v == 'true';
  }

  String get previewImage {
    return _stringConfig('preview_image');
  }

  String get bannerImage {
    final banner = _stringConfig('banner_image');
    if (banner.isNotEmpty) return banner;
    final hero =
        preview?.firstSectionMatching(RegExp('hero', caseSensitive: false));
    final heroImage = hero?.stringSetting('image') ?? '';
    return heroImage.isNotEmpty ? assetUrl(heroImage) : previewImage;
  }

  String get categoryImage {
    final image = _stringConfig('category_image');
    return image.isNotEmpty ? image : previewImage;
  }

  String _stringConfig(String key) {
    final v = config[key];
    return v is String ? v.trim() : '';
  }

  /// Legacy `compact` bool or `spacing: compact`.
  bool get spacingIsCompact {
    if (config['spacing'] == 'compact') return true;
    if (config['compact'] == true) return true;
    return false;
  }

  bool get enableQuickQty {
    final v = config['enable_quick_qty'];
    if (v == null) return false;
    return v == true || v == 1 || v == '1' || v == 'true';
  }

  /// `rounded` (default) → 12; `square` → 0; else → 8.
  double get cardBorderRadius {
    final s = config['card_style']?.toString().toLowerCase();
    if (s == 'square') return 0;
    if (s == 'rounded' || s == null || s.isEmpty) return 12;
    return 8;
  }

  EdgeInsets get cardPadding =>
      spacingIsCompact ? const EdgeInsets.all(8) : const EdgeInsets.all(12);

  EdgeInsets get listSectionPadding => spacingIsCompact
      ? const EdgeInsets.symmetric(horizontal: 10, vertical: 6)
      : const EdgeInsets.symmetric(horizontal: 16, vertical: 8);

  EdgeInsets get listTileContentPadding => spacingIsCompact
      ? const EdgeInsets.symmetric(vertical: 2, horizontal: 2)
      : const EdgeInsets.symmetric(vertical: 4, horizontal: 4);

  /// Prefer [spacingIsCompact]; kept for older theme JSON.
  bool get compact => spacingIsCompact;

  bool get hasHomeTemplate => preview?.homeSections.isNotEmpty == true;

  String assetUrl(String raw) {
    final value = raw.trim();
    if (value.isEmpty ||
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('data:')) {
      return value;
    }
    final base = preview?.assetBaseUrl.trim() ?? '';
    if (base.isEmpty) return value;
    return '${base.replaceAll(RegExp(r'/$'), '')}/${value.replaceFirst(RegExp(r'^\.?/'), '')}';
  }

  factory StorefrontTheme.fromJson(Map<String, dynamic> json) {
    String? optionalString(String camelKey, [String? snakeKey]) {
      final value = json[snakeKey ?? camelKey] ?? json[camelKey];
      final text = value?.toString().trim() ?? '';
      return text.isNotEmpty ? text : null;
    }

    return StorefrontTheme(
      themeId: optionalString('themeId', 'theme_id'),
      themeSlug: optionalString('themeSlug', 'theme_slug'),
      themeName: optionalString('themeName', 'theme_name'),
      baseLayout: (json['base_layout'] as String?)?.trim().isNotEmpty == true
          ? (json['base_layout'] as String).trim()
          : '',
      config: Map<String, dynamic>.from(
        (json['config'] as Map?)?.cast<String, dynamic>() ??
            <String, dynamic>{},
      ),
      branding: ThemeBranding.fromJson(
        (json['branding'] as Map?)?.cast<String, dynamic>() ??
            <String, dynamic>{},
      ),
      preview: ThemePreviewBundle.fromJsonOrNull(
        (json['preview'] as Map?)?.cast<String, dynamic>(),
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      if (themeId != null) 'theme_id': themeId,
      if (themeSlug != null) 'theme_slug': themeSlug,
      if (themeName != null) 'theme_name': themeName,
      'base_layout': baseLayout,
      'config': config,
      'branding': branding.toJson(),
      if (preview != null) 'preview': preview!.toJson(),
    };
  }

  StorefrontTheme withPreviewOverrides(Map<String, dynamic> state) {
    final rawTokens = state['tokenOverrides'];
    final tokens = rawTokens is Map
        ? rawTokens.cast<String, dynamic>()
        : <String, dynamic>{};
    if (tokens.isEmpty) return this;
    final nextConfig = Map<String, dynamic>.from(config);
    if (tokens['borderRadius'] is String) {
      nextConfig['card_style'] = tokens['borderRadius'];
    }
    final nextBranding = ThemeBranding(
      primaryColor: tokens['primary']?.toString() ?? branding.primaryColor,
      logo: branding.logo,
      secondaryColor:
          tokens['secondary']?.toString() ?? branding.secondaryColor,
      surfaceColor: branding.surfaceColor,
      textColor: branding.textColor,
    );
    return StorefrontTheme(
      themeId: themeId,
      themeSlug: themeSlug,
      themeName: themeName,
      baseLayout: baseLayout,
      config: nextConfig,
      branding: nextBranding,
      preview: preview,
    );
  }
}

class ThemeBranding {
  const ThemeBranding({
    required this.primaryColor,
    required this.logo,
    this.secondaryColor,
    this.surfaceColor,
    this.textColor,
  });

  final String primaryColor;
  final String logo;
  final String? secondaryColor;
  final String? surfaceColor;
  final String? textColor;

  Color get seedColor => _hexToColor(primaryColor, const Color(0xFF1565C0));
  Color get secondarySeedColor => _hexToColor(secondaryColor, seedColor);
  Color get surfaceSeedColor =>
      _hexToColor(surfaceColor, const Color(0xFFFFFFFF));
  Color get textSeedColor => _hexToColor(textColor, const Color(0xFF111827));

  factory ThemeBranding.fromJson(Map<String, dynamic> json) {
    return ThemeBranding(
      primaryColor:
          (json['primary_color'] as String?)?.trim().isNotEmpty == true
              ? (json['primary_color'] as String).trim()
              : '#1565C0',
      logo: (json['logo'] as String?) ?? '',
      secondaryColor: json['secondary_color'] as String?,
      surfaceColor: json['surface_color'] as String?,
      textColor: json['text_color'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'primary_color': primaryColor,
      'logo': logo,
      if (secondaryColor != null) 'secondary_color': secondaryColor,
      if (surfaceColor != null) 'surface_color': surfaceColor,
      if (textColor != null) 'text_color': textColor,
    };
  }
}

class ThemePreviewBundle {
  const ThemePreviewBundle({
    required this.themeName,
    required this.slug,
    required this.assetBaseUrl,
    required this.homeSections,
    required this.localeDictionary,
    required this.tokens,
  });

  final String themeName;
  final String slug;
  final String assetBaseUrl;
  final List<ThemeTemplateSection> homeSections;
  final Map<String, String> localeDictionary;
  final Map<String, dynamic> tokens;

  ThemeTemplateSection? firstSectionMatching(RegExp pattern) {
    for (final section in homeSections) {
      if (pattern.hasMatch(section.type)) return section;
    }
    return null;
  }

  factory ThemePreviewBundle.fromJson(Map<String, dynamic> json) {
    final template = (json['homeTemplate'] as Map?)?.cast<String, dynamic>() ??
        <String, dynamic>{};
    final sectionsRaw = template['sections'];
    final sections = sectionsRaw is List
        ? sectionsRaw
            .whereType<Map>()
            .map((row) =>
                ThemeTemplateSection.fromJson(row.cast<String, dynamic>()))
            .toList()
        : <ThemeTemplateSection>[];
    return ThemePreviewBundle(
      themeName: (json['themeName'] as String?)?.trim() ?? '',
      slug: (json['slug'] as String?)?.trim() ?? '',
      assetBaseUrl: (json['assetBaseUrl'] as String?)?.trim() ?? '',
      homeSections: sections,
      localeDictionary: (json['locale'] as Map?)?.map(
              (key, value) => MapEntry(key.toString(), value.toString())) ??
          const <String, String>{},
      tokens: (json['tokens'] as Map?)?.cast<String, dynamic>() ??
          <String, dynamic>{},
    );
  }

  static ThemePreviewBundle? fromJsonOrNull(Map<String, dynamic>? json) {
    if (json == null) return null;
    final bundle = ThemePreviewBundle.fromJson(json);
    return bundle.homeSections.isEmpty && bundle.localeDictionary.isEmpty
        ? null
        : bundle;
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'themeName': themeName,
      'slug': slug,
      'assetBaseUrl': assetBaseUrl,
      'locale': localeDictionary,
      'homeTemplate': <String, dynamic>{
        'sections': homeSections.map((s) => s.toJson()).toList(),
      },
      'tokens': tokens,
    };
  }
}

class ThemeTemplateSection {
  const ThemeTemplateSection({
    required this.id,
    required this.type,
    required this.settings,
  });

  final String id;
  final String type;
  final Map<String, dynamic> settings;

  factory ThemeTemplateSection.fromJson(Map<String, dynamic> json) {
    return ThemeTemplateSection(
      id: (json['id'] as String?)?.trim() ?? '',
      type: (json['type'] as String?)?.trim() ?? '',
      settings: (json['settings'] as Map?)?.cast<String, dynamic>() ??
          <String, dynamic>{},
    );
  }

  String stringSetting(String key, [String fallback = '']) {
    final v = settings[key];
    return v is String && v.trim().isNotEmpty ? v.trim() : fallback;
  }

  List<String> stringListSetting(String key) {
    final v = settings[key];
    return v is List
        ? v.whereType<String>().where((s) => s.trim().isNotEmpty).toList()
        : const <String>[];
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'type': type,
      'settings': settings,
    };
  }
}
