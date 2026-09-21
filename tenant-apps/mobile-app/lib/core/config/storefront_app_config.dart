import '../localization/language_contract.dart';

/// From `GET /storefront/app-config` (Nest `data` object, camelCase).
class StorefrontAppConfig {
  const StorefrontAppConfig({
    required this.allowGuestAccess,
    required this.showPricesToGuest,
    required this.allowGuestCart,
    required this.enableRepeatOrder,
    required this.enableCreditView,
    required this.enableNotifications,
    required this.defaultHomeLayout,
    required this.showBanner,
    required this.selectedLanguageCode,
    required this.languageContract,
    this.industryId,
    this.industryName,
  });

  factory StorefrontAppConfig.fromJson(Map<String, dynamic> json) {
    bool b(dynamic v) => v == true || v == 1 || v == '1' || v == 'true';
    final layoutRaw = (json['defaultHomeLayout'] ?? json['default_home_layout'])
            ?.toString()
            .toLowerCase() ??
        'grid';
    final String selectedLanguageCode = resolveActiveLanguage(
      (json['selectedLanguageCode'] ?? json['selected_language_code'] ?? 'en')
          .toString(),
    );
    final Object? rawContract =
        json['languageContract'] ?? json['language_contract'];
    final String? industryId = _optionalString(
      json['industryId'] ?? json['industry_id'],
    );
    final String? industryName = _optionalString(
      json['industryName'] ?? json['industry_name'],
    );
    return StorefrontAppConfig(
      allowGuestAccess:
          b(json['allowGuestAccess'] ?? json['allow_guest_access']),
      showPricesToGuest:
          b(json['showPricesToGuest'] ?? json['show_prices_to_guest']),
      allowGuestCart: b(json['allowGuestCart'] ?? json['allow_guest_cart']),
      enableRepeatOrder:
          b(json['enableRepeatOrder'] ?? json['enable_repeat_order'] ?? true),
      enableCreditView:
          b(json['enableCreditView'] ?? json['enable_credit_view'] ?? true),
      enableNotifications: b(
          json['enableNotifications'] ?? json['enable_notifications'] ?? true),
      defaultHomeLayout: layoutRaw == 'list' ? 'list' : 'grid',
      showBanner: b(json['showBanner'] ?? json['show_banner'] ?? true),
      selectedLanguageCode: selectedLanguageCode,
      languageContract: LocalizationContract.fromJson(
        rawContract is Map ? Map<String, dynamic>.from(rawContract) : null,
        fallbackLanguage: selectedLanguageCode,
      ),
      industryId: industryId,
      industryName: industryName,
    );
  }

  static String? _optionalString(Object? value) {
    final String text = value?.toString().trim() ?? '';
    return text.isEmpty ? null : text;
  }

  final bool allowGuestAccess;
  final bool showPricesToGuest;
  final bool allowGuestCart;
  final bool enableRepeatOrder;
  final bool enableCreditView;
  final bool enableNotifications;

  /// `grid` or `list` — mobile home layout override.
  final String defaultHomeLayout;
  final bool showBanner;
  final String selectedLanguageCode;
  final LocalizationContract languageContract;
  final String? industryId;
  final String? industryName;

  String get industryLabel => industryName ?? 'General B2B commerce';
}
