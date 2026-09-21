import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const FlutterSecureStorage authTokenStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
  iOptions: IOSOptions(
    accessibility: KeychainAccessibility.first_unlock_this_device,
  ),
);

class AuthTokenStorage {
  const AuthTokenStorage();

  static const String _key = 'jwt';

  Future<String?> read() async {
    final token = await authTokenStorage.read(key: _key);
    final clean = token?.trim();
    return clean == null || clean.isEmpty ? null : clean;
  }

  Future<void> write(String token) {
    return authTokenStorage.write(key: _key, value: token.trim());
  }

  Future<void> clear() {
    return authTokenStorage.delete(key: _key);
  }
}
