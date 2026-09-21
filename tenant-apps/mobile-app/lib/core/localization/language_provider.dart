import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../config/storefront_app_config_provider.dart';
import '../config/user_app_settings_provider.dart';
import 'language_contract.dart';
import '../config/build_config.dart';
import '../theme/theme_provider.dart';
import 'mobile_localization_service.dart';

final previewLocalizationContractProvider =
    StateProvider<LocalizationContract?>((Ref ref) {
      final Object? rawContract =
          BuildConfig.resolvedPreviewState['languageContract'];
      final String previewLanguage = BuildConfig.previewAppLanguageOverride
          .trim();
      if (rawContract is Map) {
        return LocalizationContract.fromJson(
          Map<String, dynamic>.from(rawContract),
          fallbackLanguage: previewLanguage.isNotEmpty ? previewLanguage : 'en',
        );
      }
      if (previewLanguage.isNotEmpty) {
        return LocalizationContract.fromLanguage(previewLanguage);
      }
      return null;
    });

final localizationContractProvider = Provider<LocalizationContract>((Ref ref) {
  final preview = ref.watch(previewLocalizationContractProvider);
  if (preview != null && BuildConfig.languageConsistencyEnabled) {
    return preview;
  }
  final tenant = ref.watch(tenantConfigProvider);
  final cfg = ref.watch(storefrontAppConfigProvider).asData?.value;
  final String selectedLanguage = ref.watch(
    userAppSettingsProvider.select(
      (UserAppSettings settings) => settings.languageCode,
    ),
  );
  final String value = selectedLanguage.trim().isNotEmpty
      ? selectedLanguage
      : cfg?.selectedLanguageCode.trim().isNotEmpty == true
      ? cfg!.selectedLanguageCode
      : tenant.languageCode;
  final String resolvedLanguage = resolveActiveLanguage(value);
  final LocalizationContract? serverContract = cfg?.languageContract;
  return LocalizationContract(
    languageCode: resolvedLanguage,
    locale: localeNameForLanguage(resolvedLanguage),
    direction: isRtlLanguage(resolvedLanguage)
        ? TextDirection.rtl
        : TextDirection.ltr,
    revision: serverContract?.revision ?? 0,
    supportedLanguages:
        serverContract?.supportedLanguages ?? enterpriseSupportedLanguages,
    languageOptions:
        serverContract?.languageOptions ?? const <LanguageOption>[],
    source: 'user_app_settings',
  );
});

final selectedAppLanguageProvider = Provider<String>((Ref ref) {
  final contract = ref.watch(localizationContractProvider);
  return BuildConfig.languageConsistencyEnabled
      ? contract.languageCode
      : contract.languageCode;
});

final mobileLocalizationServiceProvider = Provider<MobileLocalizationService>((
  Ref ref,
) {
  final contract = ref.watch(localizationContractProvider);
  final theme = ref.watch(themeProvider);
  final String currency = ref.watch(
    userAppSettingsProvider.select(
      (UserAppSettings settings) => settings.currencyCode,
    ),
  );
  return MobileLocalizationService(
    contract: contract,
    dictionary: theme.preview?.localeDictionary ?? const <String, String>{},
    defaultCurrency: currency,
  );
});

final appTranslatorProvider = Provider<String Function(String)>((Ref ref) {
  final service = ref.watch(mobileLocalizationServiceProvider);
  return service.t;
});
