import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
      onError: (err, handler) {
        if (kDebugMode) {
          final res = err.response;
          final req = err.requestOptions;
          debugPrint(
            '[api_error] ${req.method} ${req.uri}\n'
            '            status=${res?.statusCode}\n'
            '            message=${err.message}',
          );
        }
        handler.next(err);
      },
    ),
  );
  return dio;
});
