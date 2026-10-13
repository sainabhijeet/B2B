import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_token_storage.dart';
import 'dio_errors.dart';
import '../config/build_config.dart';
import '../device/storefront_device.dart';
import '../tenant/tenant_config.dart';

final tenantConfigProvider =
    Provider<TenantConfig>((_) => TenantRegistry.current());

final authTokenProvider = StateProvider<String?>((_) => null);
final activeApiBaseUrlProvider = StateProvider<String?>((_) => null);

/// Same tenant resolution strategy as `tenant-apps/storefront-web/lib/storefrontApi.ts`.
void _applyStorefrontTenantHeaders(RequestOptions options) {
  options.headers.remove('x-tenant-code');

  final tid = BuildConfig.resolvedTenantUuid;
  if (tid.isNotEmpty) {
    options.headers['X-Tenant-Id'] = tid;
    return;
  }

  final host = BuildConfig.resolvedStorefrontHost.trim();
  if (host.isNotEmpty) {
    options.headers['X-Storefront-Host'] = host;
    return;
  }

  final slug = BuildConfig.resolvedTenantCode.trim();
  if (kDebugMode && slug.isNotEmpty && slug != 'default') {
    options.headers['X-Storefront-Host'] = '$slug.localhost:5175';
    return;
  }
  if (kDebugMode) {
    /// Override with `--dart-define=DEBUG_STOREFRONT_HOST=other.localhost:5175` or `=` empty to skip.
    const fallback = String.fromEnvironment(
      'DEBUG_STOREFRONT_HOST',
      defaultValue: 'abc-traders.localhost:5175',
    );
    final h = fallback.trim();
    if (h.isNotEmpty) {
      options.headers['X-Storefront-Host'] = h;
    }
  }
}

final apiClientProvider = Provider<Dio>((ref) {
  final tenant = ref.watch(tenantConfigProvider);
  final activeBaseUrl = ref.watch(activeApiBaseUrlProvider);
  ref.watch(authTokenProvider);

  final base = (activeBaseUrl?.trim().isNotEmpty == true
          ? activeBaseUrl!.trim()
          : tenant.apiBaseUrl.trim())
      .replaceAll(RegExp(r'/$'), '');
  final dio = Dio(
    BaseOptions(
      baseUrl: base,
      connectTimeout: const Duration(seconds: 45),
      receiveTimeout: const Duration(seconds: 30),
    ),
  );
  Future<String?>? refreshInFlight;

  Future<String?> refreshAccessToken() async {
    final Future<String?>? current = refreshInFlight;
    if (current != null) return current;

    final Future<String?> refresh = (() async {
      const AuthTokenStorage storage = AuthTokenStorage();
      final String? refreshToken = await storage.readRefreshToken();
      if (refreshToken == null) return null;

      try {
        final String deviceId =
            await StorefrontDevice.ensureStorefrontDeviceId();
        final Dio refreshClient = Dio(
          BaseOptions(
            baseUrl: base,
            connectTimeout: const Duration(seconds: 45),
            receiveTimeout: const Duration(seconds: 30),
          ),
        );
        final response = await refreshClient.post<Map<String, dynamic>>(
          '/auth/refresh',
          data: <String, dynamic>{
            'refreshToken': refreshToken,
            'deviceId': deviceId,
          },
        );
        final String? accessToken = extractAccessToken(response.data);
        final String? rotatedRefreshToken = extractRefreshToken(response.data);
        if (accessToken == null || rotatedRefreshToken == null) return null;
        await storage.writeTokens(
          accessToken: accessToken,
          refreshToken: rotatedRefreshToken,
        );
        ref.read(authTokenProvider.notifier).state = accessToken;
        return accessToken;
      } on DioException {
        return null;
      }
    })();
    refreshInFlight = refresh;
    try {
      return await refresh;
    } finally {
      refreshInFlight = null;
    }
  }

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        _applyStorefrontTenantHeaders(options);
        final String did = StorefrontDevice.current;
        if (did.isNotEmpty) {
          options.headers['X-Device-Id'] = did;
        }
        final token = ref.read(authTokenProvider);
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        if (kDebugMode) {
          debugPrint(
            '[api] ${options.method} ${options.uri}\n'
            '      X-Tenant-Id=${options.headers['X-Tenant-Id']} '
            'X-Storefront-Host=${options.headers['X-Storefront-Host']}',
          );
        }
        handler.next(options);
      },
      onError: (err, handler) async {
        if (kDebugMode) {
          final res = err.response;
          final req = err.requestOptions;
          debugPrint(
            '[api_error] ${req.method} ${req.uri}\n'
            '            status=${res?.statusCode}\n'
            '            message=${err.message}',
          );
        }
        final RequestOptions request = err.requestOptions;
        final bool canRefresh = err.response?.statusCode == 401 &&
            request.extra['authRefreshRetry'] != true &&
            !request.path.endsWith('/auth/refresh') &&
            !request.path.endsWith('/storefront/customer/login') &&
            !request.path.endsWith('/storefront/customer/verify-otp');
        if (canRefresh) {
          final String? accessToken = await refreshAccessToken();
          if (accessToken != null) {
            request.extra['authRefreshRetry'] = true;
            request.headers['Authorization'] = 'Bearer $accessToken';
            try {
              final Response<dynamic> response = await dio.fetch(request);
              handler.resolve(response);
              return;
            } on DioException catch (retryError) {
              handler.next(retryError);
              return;
            }
          }
          await const AuthTokenStorage().clear();
          ref.read(authTokenProvider.notifier).state = null;
        }
        handler.next(err);
      },
    ),
  );
  return dio;
});
