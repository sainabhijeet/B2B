import 'package:flutter/material.dart';
import 'package:intl/intl.dart' hide TextDirection;

const List<String> enterpriseSupportedLanguages = <String>[
  'en',
  'hi',
  'zh',
  'ar',
  'fr',
  'de',
  'es',
  'gu',
  'ur',
  'ru',
  'ja',
];

const Set<String> supportedPlatformLanguages = <String>{
  'en',
  'hi',
  'zh',
  'ar',
  'fr',
  'de',
  'es',
  'gu',
  'ur',
  'ru',
  'ja',
};

const Set<String> enterpriseRtlLanguages = <String>{'ar', 'ur'};

class LanguageOption {
  const LanguageOption({required this.code, required this.name});

  final String code;
  final String name;

  factory LanguageOption.fromJson(Map<String, dynamic> json) {
    return LanguageOption(
      code: resolveActiveLanguage(json['code']?.toString()),
      name: json['name']?.toString().trim() ?? '',
    );
  }
}

class LocalizationContract {
  const LocalizationContract({
    required this.languageCode,
    required this.locale,
    required this.direction,
    required this.revision,
    required this.supportedLanguages,
    required this.source,
    this.languageOptions = const <LanguageOption>[],
  });

  factory LocalizationContract.fromJson(
    Map<String, dynamic>? json, {
    String fallbackLanguage = 'en',
  }) {
    final String languageCode = resolveActiveLanguage(
      json?['languageCode']?.toString() ?? fallbackLanguage,
    );
    final String rawDirection =
        json?['direction']?.toString().toLowerCase().trim() ?? '';
    final Object? rawSupported = json?['supportedLanguages'];
    final Object? rawOptions = json?['languageOptions'];
    final List<String> supported = rawSupported is List
        ? rawSupported
            .map((Object? value) => resolveActiveLanguage(value?.toString()))
            .where((String value) => value.isNotEmpty)
            .toSet()
            .toList(growable: false)
        : enterpriseSupportedLanguages;
    final List<LanguageOption> options = rawOptions is List
        ? rawOptions
            .whereType<Map>()
            .map(
              (Map raw) =>
                  LanguageOption.fromJson(Map<String, dynamic>.from(raw)),
            )
            .where(
              (LanguageOption option) =>
                  option.code.isNotEmpty && option.name.isNotEmpty,
            )
            .toList(growable: false)
        : const <LanguageOption>[];

    return LocalizationContract(
      languageCode: languageCode,
      locale: (json?['locale']?.toString().trim().isNotEmpty ?? false)
          ? json!['locale'].toString().trim()
          : localeNameForLanguage(languageCode),
      direction: rawDirection == 'rtl' || isRtlLanguage(languageCode)
          ? TextDirection.rtl
          : TextDirection.ltr,
      revision: int.tryParse(json?['revision']?.toString() ?? '') ?? 0,
      supportedLanguages:
          supported.isEmpty ? enterpriseSupportedLanguages : supported,
      languageOptions: options,
      source: (json?['source']?.toString().trim().isNotEmpty ?? false)
          ? json!['source'].toString().trim()
          : 'tenant_app_settings.selected_language_code',
    );
  }

  factory LocalizationContract.fromLanguage(String? languageCode) {
    final String resolved = resolveActiveLanguage(languageCode);
    return LocalizationContract(
      languageCode: resolved,
      locale: localeNameForLanguage(resolved),
      direction:
          isRtlLanguage(resolved) ? TextDirection.rtl : TextDirection.ltr,
      revision: 0,
      supportedLanguages: enterpriseSupportedLanguages,
      source: 'tenant_app_settings.selected_language_code',
    );
  }

  final String languageCode;
  final String locale;
  final TextDirection direction;
  final int revision;
  final List<String> supportedLanguages;
  final List<LanguageOption> languageOptions;
  final String source;

  bool get isRtl => direction == TextDirection.rtl;

  Locale get flutterLocale => localeForLanguage(languageCode);

  String get directionName => isRtl ? 'rtl' : 'ltr';
}

String resolveActiveLanguage(String? value, {String fallback = 'en'}) {
  final String code =
      (value ?? '').trim().toLowerCase().replaceAll('_', '-').split('-').first;
  return supportedPlatformLanguages.contains(code) ? code : fallback;
}

bool isRtlLanguage(String? value) =>
    enterpriseRtlLanguages.contains(resolveActiveLanguage(value));

Locale localeForLanguage(String? value) => Locale(resolveActiveLanguage(value));

String localeNameForLanguage(String? value) {
  final String code = resolveActiveLanguage(value);
  return code == 'en' ? 'en_IN' : code;
}

String formatCurrency(num value, String? language, String currency) {
  final String code = resolveActiveLanguage(language);
  final String locale = localeNameForLanguage(code);
  return NumberFormat.currency(
    locale: locale,
    name: currency.toUpperCase(),
  ).format(value);
}

String formatNumber(num value, String? language) {
  return NumberFormat.decimalPattern(
    localeNameForLanguage(language),
  ).format(value);
}

String formatDate(DateTime value, String? language) {
  return DateFormat.yMMMd(localeNameForLanguage(language)).format(
    value.toLocal(),
  );
}

String formatDateTime(DateTime value, String? language) {
  return DateFormat.yMMMd(
    localeNameForLanguage(language),
  ).add_jm().format(value.toLocal());
}
