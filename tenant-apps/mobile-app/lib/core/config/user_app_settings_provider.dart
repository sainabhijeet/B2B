import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../localization/language_contract.dart';
import 'storefront_app_config_provider.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((Ref ref) {
  throw StateError('SharedPreferences has not been initialized.');
});

class UserAppSettings {
  const UserAppSettings({
    required this.languageCode,
    required this.regionCode,
    required this.currencyCode,
    required this.themeMode,
    required this.textScale,
    required this.guestCartEnabled,
    required this.ordersEnabled,
    required this.creditEnabled,
    required this.notificationsEnabled,
    required this.orderUpdatesEnabled,
    required this.promotionsEnabled,
    required this.paymentRemindersEnabled,
    required this.creditAlertsEnabled,
    required this.pushNotificationsEnabled,
    required this.whatsAppNotificationsEnabled,
    required this.smsNotificationsEnabled,
    required this.emailNotificationsEnabled,
    required this.repeatOrdersEnabled,
    required this.defaultAddressId,
    required this.preferredWarehouse,
    required this.defaultPaymentMethod,
    required this.invoiceEmailEnabled,
    required this.billingName,
    required this.gstNumber,
    required this.analyticsEnabled,
    required this.recommendationsEnabled,
  });

  final String languageCode;
  final String regionCode;
  final String currencyCode;
  final String themeMode;
  final double textScale;
  final bool guestCartEnabled;
  final bool ordersEnabled;
  final bool creditEnabled;
  final bool notificationsEnabled;
  final bool orderUpdatesEnabled;
  final bool promotionsEnabled;
  final bool paymentRemindersEnabled;
  final bool creditAlertsEnabled;
  final bool pushNotificationsEnabled;
  final bool whatsAppNotificationsEnabled;
  final bool smsNotificationsEnabled;
  final bool emailNotificationsEnabled;
  final bool repeatOrdersEnabled;
  final String defaultAddressId;
  final String preferredWarehouse;
  final String defaultPaymentMethod;
  final bool invoiceEmailEnabled;
  final String billingName;
  final String gstNumber;
  final bool analyticsEnabled;
  final bool recommendationsEnabled;

  UserAppSettings copyWith({
    String? languageCode,
    String? regionCode,
    String? currencyCode,
    String? themeMode,
    double? textScale,
    bool? guestCartEnabled,
    bool? ordersEnabled,
    bool? creditEnabled,
    bool? notificationsEnabled,
    bool? orderUpdatesEnabled,
    bool? promotionsEnabled,
    bool? paymentRemindersEnabled,
    bool? creditAlertsEnabled,
    bool? pushNotificationsEnabled,
    bool? whatsAppNotificationsEnabled,
    bool? smsNotificationsEnabled,
    bool? emailNotificationsEnabled,
    bool? repeatOrdersEnabled,
    String? defaultAddressId,
    String? preferredWarehouse,
    String? defaultPaymentMethod,
    bool? invoiceEmailEnabled,
    String? billingName,
    String? gstNumber,
    bool? analyticsEnabled,
    bool? recommendationsEnabled,
  }) {
    return UserAppSettings(
      languageCode: languageCode ?? this.languageCode,
      regionCode: regionCode ?? this.regionCode,
      currencyCode: currencyCode ?? this.currencyCode,
      themeMode: themeMode ?? this.themeMode,
      textScale: textScale ?? this.textScale,
      guestCartEnabled: guestCartEnabled ?? this.guestCartEnabled,
      ordersEnabled: ordersEnabled ?? this.ordersEnabled,
      creditEnabled: creditEnabled ?? this.creditEnabled,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      orderUpdatesEnabled: orderUpdatesEnabled ?? this.orderUpdatesEnabled,
      promotionsEnabled: promotionsEnabled ?? this.promotionsEnabled,
      paymentRemindersEnabled:
          paymentRemindersEnabled ?? this.paymentRemindersEnabled,
      creditAlertsEnabled: creditAlertsEnabled ?? this.creditAlertsEnabled,
      pushNotificationsEnabled:
          pushNotificationsEnabled ?? this.pushNotificationsEnabled,
      whatsAppNotificationsEnabled:
          whatsAppNotificationsEnabled ?? this.whatsAppNotificationsEnabled,
      smsNotificationsEnabled:
          smsNotificationsEnabled ?? this.smsNotificationsEnabled,
      emailNotificationsEnabled:
          emailNotificationsEnabled ?? this.emailNotificationsEnabled,
      repeatOrdersEnabled: repeatOrdersEnabled ?? this.repeatOrdersEnabled,
      defaultAddressId: defaultAddressId ?? this.defaultAddressId,
      preferredWarehouse: preferredWarehouse ?? this.preferredWarehouse,
      defaultPaymentMethod: defaultPaymentMethod ?? this.defaultPaymentMethod,
      invoiceEmailEnabled: invoiceEmailEnabled ?? this.invoiceEmailEnabled,
      billingName: billingName ?? this.billingName,
      gstNumber: gstNumber ?? this.gstNumber,
      analyticsEnabled: analyticsEnabled ?? this.analyticsEnabled,
      recommendationsEnabled:
          recommendationsEnabled ?? this.recommendationsEnabled,
    );
  }
}

class UserAppSettingsController extends StateNotifier<UserAppSettings> {
  UserAppSettingsController(
    this._preferences,
    UserAppSettings initialSettings,
    this._defaults,
  ) : super(initialSettings);

  static const String _prefix = 'app.settings.';
  static const String _languageKey = '${_prefix}language';
  static const String _regionKey = '${_prefix}region';
  static const String _currencyKey = '${_prefix}currency';
  static const String _themeModeKey = '${_prefix}theme_mode';
  static const String _textScaleKey = '${_prefix}text_scale';
  static const String _guestCartKey = '${_prefix}guest_cart';
  static const String _ordersKey = '${_prefix}orders';
  static const String _creditKey = '${_prefix}credit';
  static const String _notificationsKey = '${_prefix}notifications';
  static const String _orderUpdatesKey = '${_prefix}order_updates';
  static const String _promotionsKey = '${_prefix}promotions';
  static const String _paymentRemindersKey = '${_prefix}payment_reminders';
  static const String _creditAlertsKey = '${_prefix}credit_alerts';
  static const String _pushKey = '${_prefix}push';
  static const String _whatsAppKey = '${_prefix}whatsapp';
  static const String _smsKey = '${_prefix}sms';
  static const String _emailKey = '${_prefix}email';
  static const String _repeatOrdersKey = '${_prefix}repeat_orders';
  static const String _defaultAddressKey = '${_prefix}default_address';
  static const String _warehouseKey = '${_prefix}warehouse';
  static const String _paymentMethodKey = '${_prefix}payment_method';
  static const String _invoiceEmailKey = '${_prefix}invoice_email';
  static const String _billingNameKey = '${_prefix}billing_name';
  static const String _gstNumberKey = '${_prefix}gst_number';
  static const String _analyticsKey = '${_prefix}analytics';
  static const String _recommendationsKey = '${_prefix}recommendations';

  static const List<String> _allKeys = <String>[
    _languageKey,
    _regionKey,
    _currencyKey,
    _themeModeKey,
    _textScaleKey,
    _guestCartKey,
    _ordersKey,
    _creditKey,
    _notificationsKey,
    _orderUpdatesKey,
    _promotionsKey,
    _paymentRemindersKey,
    _creditAlertsKey,
    _pushKey,
    _whatsAppKey,
    _smsKey,
    _emailKey,
    _repeatOrdersKey,
    _defaultAddressKey,
    _warehouseKey,
    _paymentMethodKey,
    _invoiceEmailKey,
    _billingNameKey,
    _gstNumberKey,
    _analyticsKey,
    _recommendationsKey,
  ];

  final SharedPreferences _preferences;
  final UserAppSettings _defaults;

  void setLanguage(String value) => _setString(
        _languageKey,
        resolveActiveLanguage(value),
        (String next) => state.copyWith(languageCode: next),
      );

  void setRegion(String value) => _setString(
        _regionKey,
        value.toUpperCase(),
        (String next) => state.copyWith(regionCode: next),
      );

  void setCurrency(String value) => _setString(
        _currencyKey,
        value.toUpperCase(),
        (String next) => state.copyWith(currencyCode: next),
      );

  void setThemeMode(String value) => _setString(
        _themeModeKey,
        value,
        (String next) => state.copyWith(themeMode: next),
      );

  void setTextScale(double value) {
    final double next = value.clamp(0.85, 1.30);
    state = state.copyWith(textScale: next);
    _preferences.setDouble(_textScaleKey, next);
  }

  void setGuestCartEnabled(bool value) => _setBool(
        _guestCartKey,
        value,
        (bool next) => state.copyWith(guestCartEnabled: next),
      );

  void setOrdersEnabled(bool value) => _setBool(
        _ordersKey,
        value,
        (bool next) => state.copyWith(ordersEnabled: next),
      );

  void setCreditEnabled(bool value) => _setBool(
        _creditKey,
        value,
        (bool next) => state.copyWith(creditEnabled: next),
      );

  void setNotificationsEnabled(bool value) => _setBool(
        _notificationsKey,
        value,
        (bool next) => state.copyWith(notificationsEnabled: next),
      );

  void setOrderUpdatesEnabled(bool value) => _setBool(
        _orderUpdatesKey,
        value,
        (bool next) => state.copyWith(orderUpdatesEnabled: next),
      );

  void setPromotionsEnabled(bool value) => _setBool(
        _promotionsKey,
        value,
        (bool next) => state.copyWith(promotionsEnabled: next),
      );

  void setPaymentRemindersEnabled(bool value) => _setBool(
        _paymentRemindersKey,
        value,
        (bool next) => state.copyWith(paymentRemindersEnabled: next),
      );

  void setCreditAlertsEnabled(bool value) => _setBool(
        _creditAlertsKey,
        value,
        (bool next) => state.copyWith(creditAlertsEnabled: next),
      );

  void setPushNotificationsEnabled(bool value) => _setBool(
        _pushKey,
        value,
        (bool next) => state.copyWith(pushNotificationsEnabled: next),
      );

  void setWhatsAppNotificationsEnabled(bool value) => _setBool(
        _whatsAppKey,
        value,
        (bool next) => state.copyWith(whatsAppNotificationsEnabled: next),
      );

  void setSmsNotificationsEnabled(bool value) => _setBool(
        _smsKey,
        value,
        (bool next) => state.copyWith(smsNotificationsEnabled: next),
      );

  void setEmailNotificationsEnabled(bool value) => _setBool(
        _emailKey,
        value,
        (bool next) => state.copyWith(emailNotificationsEnabled: next),
      );

  void setRepeatOrdersEnabled(bool value) => _setBool(
        _repeatOrdersKey,
        value,
        (bool next) => state.copyWith(repeatOrdersEnabled: next),
      );

  void setDefaultAddress(String value) => _setString(
        _defaultAddressKey,
        value,
        (String next) => state.copyWith(defaultAddressId: next),
      );

  void setPreferredWarehouse(String value) => _setString(
        _warehouseKey,
        value.trim(),
        (String next) => state.copyWith(preferredWarehouse: next),
      );

  void setDefaultPaymentMethod(String value) => _setString(
        _paymentMethodKey,
        value,
        (String next) => state.copyWith(defaultPaymentMethod: next),
      );

  void setInvoiceEmailEnabled(bool value) => _setBool(
        _invoiceEmailKey,
        value,
        (bool next) => state.copyWith(invoiceEmailEnabled: next),
      );

  void setBillingName(String value) => _setString(
        _billingNameKey,
        value.trim(),
        (String next) => state.copyWith(billingName: next),
      );

  void setGstNumber(String value) => _setString(
        _gstNumberKey,
        value.trim().toUpperCase(),
        (String next) => state.copyWith(gstNumber: next),
      );

  void setAnalyticsEnabled(bool value) => _setBool(
        _analyticsKey,
        value,
        (bool next) => state.copyWith(analyticsEnabled: next),
      );

  void setRecommendationsEnabled(bool value) => _setBool(
        _recommendationsKey,
        value,
        (bool next) => state.copyWith(recommendationsEnabled: next),
      );

  Future<void> resetPreferences() async {
    await Future.wait(_allKeys.map(_preferences.remove));
    state = _defaults;
  }

  void _setString(
    String key,
    String value,
    UserAppSettings Function(String) update,
  ) {
    state = update(value);
    _preferences.setString(key, value);
  }

  void _setBool(
    String key,
    bool value,
    UserAppSettings Function(bool) update,
  ) {
    state = update(value);
    _preferences.setBool(key, value);
  }
}

final userAppSettingsProvider =
    StateNotifierProvider<UserAppSettingsController, UserAppSettings>(
  (Ref ref) {
    final SharedPreferences preferences = ref.watch(sharedPreferencesProvider);
    final config = ref.watch(storefrontAppConfigProvider).asData?.value;
    final List<String> availableLanguages =
        config?.languageContract.supportedLanguages ??
            enterpriseSupportedLanguages;
    final String configuredLanguage = resolveActiveLanguage(
      config?.selectedLanguageCode ?? enterpriseSupportedLanguages.first,
    );
    final String defaultLanguage = availableLanguages.contains(
      configuredLanguage,
    )
        ? configuredLanguage
        : availableLanguages.isNotEmpty
            ? availableLanguages.first
            : enterpriseSupportedLanguages.first;
    final String savedLanguage = resolveActiveLanguage(
      preferences.getString(UserAppSettingsController._languageKey) ??
          defaultLanguage,
    );
    final UserAppSettings defaults = UserAppSettings(
      languageCode: defaultLanguage,
      regionCode: 'IN',
      currencyCode: 'INR',
      themeMode: 'system',
      textScale: 0.85,
      guestCartEnabled: config?.allowGuestCart ?? true,
      ordersEnabled: config?.enableRepeatOrder ?? true,
      creditEnabled: config?.enableCreditView ?? true,
      notificationsEnabled: config?.enableNotifications ?? true,
      orderUpdatesEnabled: true,
      promotionsEnabled: false,
      paymentRemindersEnabled: true,
      creditAlertsEnabled: true,
      pushNotificationsEnabled: true,
      whatsAppNotificationsEnabled: true,
      smsNotificationsEnabled: true,
      emailNotificationsEnabled: false,
      repeatOrdersEnabled: true,
      defaultAddressId: '',
      preferredWarehouse: '',
      defaultPaymentMethod: 'bank_transfer',
      invoiceEmailEnabled: true,
      billingName: '',
      gstNumber: '',
      analyticsEnabled: true,
      recommendationsEnabled: true,
    );
    final UserAppSettings initialSettings = defaults.copyWith(
      languageCode: availableLanguages.contains(savedLanguage)
          ? savedLanguage
          : defaultLanguage,
      regionCode: preferences.getString(UserAppSettingsController._regionKey),
      currencyCode:
          preferences.getString(UserAppSettingsController._currencyKey),
      themeMode: preferences.getString(UserAppSettingsController._themeModeKey),
      textScale: preferences.getDouble(UserAppSettingsController._textScaleKey),
      guestCartEnabled:
          preferences.getBool(UserAppSettingsController._guestCartKey),
      ordersEnabled: preferences.getBool(UserAppSettingsController._ordersKey),
      creditEnabled: preferences.getBool(UserAppSettingsController._creditKey),
      notificationsEnabled:
          preferences.getBool(UserAppSettingsController._notificationsKey),
      orderUpdatesEnabled:
          preferences.getBool(UserAppSettingsController._orderUpdatesKey),
      promotionsEnabled:
          preferences.getBool(UserAppSettingsController._promotionsKey),
      paymentRemindersEnabled:
          preferences.getBool(UserAppSettingsController._paymentRemindersKey),
      creditAlertsEnabled:
          preferences.getBool(UserAppSettingsController._creditAlertsKey),
      pushNotificationsEnabled:
          preferences.getBool(UserAppSettingsController._pushKey),
      whatsAppNotificationsEnabled:
          preferences.getBool(UserAppSettingsController._whatsAppKey),
      smsNotificationsEnabled:
          preferences.getBool(UserAppSettingsController._smsKey),
      emailNotificationsEnabled:
          preferences.getBool(UserAppSettingsController._emailKey),
      repeatOrdersEnabled:
          preferences.getBool(UserAppSettingsController._repeatOrdersKey),
      defaultAddressId:
          preferences.getString(UserAppSettingsController._defaultAddressKey),
      preferredWarehouse:
          preferences.getString(UserAppSettingsController._warehouseKey),
      defaultPaymentMethod:
          preferences.getString(UserAppSettingsController._paymentMethodKey),
      invoiceEmailEnabled:
          preferences.getBool(UserAppSettingsController._invoiceEmailKey),
      billingName:
          preferences.getString(UserAppSettingsController._billingNameKey),
      gstNumber: preferences.getString(UserAppSettingsController._gstNumberKey),
      analyticsEnabled:
          preferences.getBool(UserAppSettingsController._analyticsKey),
      recommendationsEnabled:
          preferences.getBool(UserAppSettingsController._recommendationsKey),
    );
    return UserAppSettingsController(preferences, initialSettings, defaults);
  },
);
