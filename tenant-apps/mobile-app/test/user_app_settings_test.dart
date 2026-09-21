import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/core/config/user_app_settings_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

UserAppSettings settings({
  String language = 'en',
  String currency = 'INR',
  String themeMode = 'system',
}) {
  return UserAppSettings(
    languageCode: language,
    regionCode: 'IN',
    currencyCode: currency,
    themeMode: themeMode,
    textScale: 1,
    guestCartEnabled: true,
    ordersEnabled: true,
    creditEnabled: true,
    notificationsEnabled: true,
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
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('resetPreferences restores store defaults', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    final UserAppSettings defaults = settings();
    final UserAppSettingsController controller = UserAppSettingsController(
      preferences,
      settings(language: 'hi', currency: 'USD', themeMode: 'dark'),
      defaults,
    );

    controller.setCurrency('EUR');
    controller.setThemeMode('light');
    await controller.resetPreferences();

    expect(controller.state.languageCode, 'en');
    expect(controller.state.currencyCode, 'INR');
    expect(controller.state.themeMode, 'system');
  });
}
