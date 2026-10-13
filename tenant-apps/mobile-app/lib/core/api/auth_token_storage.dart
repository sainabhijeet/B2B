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
  static const String _refreshKey = 'refresh_token';

  Future<String?> read() async {
    final token = await authTokenStorage.read(key: _key);
    final clean = token?.trim();
    return clean == null || clean.isEmpty ? null : clean;
  }

  Future<void> write(String token) {
    return authTokenStorage.write(key: _key, value: token.trim());
  }

  Future<String?> readRefreshToken() async {
    final token = await authTokenStorage.read(key: _refreshKey);
    final clean = token?.trim();
    return clean == null || clean.isEmpty ? null : clean;
  }

  Future<void> writeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await authTokenStorage.write(key: _key, value: accessToken.trim());
    await authTokenStorage.write(
      key: _refreshKey,
      value: refreshToken.trim(),
    );
  }

  Future<void> clear() async {
    await authTokenStorage.delete(key: _key);
    await authTokenStorage.delete(key: _refreshKey);
  }
}
