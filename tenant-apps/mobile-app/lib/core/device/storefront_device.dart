import 'package:shared_preferences/shared_preferences.dart';

/// Stable device id for OTP + guest cart (`X-Device-Id`). Initialized in [ensureStorefrontDeviceId] before [runApp].
class StorefrontDevice {
  StorefrontDevice._();

  static String? _id;

  static String get current => _id ?? '';

  static Future<String> ensureStorefrontDeviceId() async {
    if (_id != null && _id!.isNotEmpty) return _id!;
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString('storefront_device_id')?.trim();
    if (id == null || id.isEmpty) {
      id = 'mobile-${DateTime.now().millisecondsSinceEpoch}';
      await prefs.setString('storefront_device_id', id);
    }
    _id = id;
    return id;
  }
}
