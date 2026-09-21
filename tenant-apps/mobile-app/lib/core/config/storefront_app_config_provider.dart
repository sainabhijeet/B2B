import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/nest_json.dart';
import '../localization/language_contract.dart';
import 'storefront_app_config.dart';

final storefrontAppConfigProvider =
    FutureProvider<StorefrontAppConfig>((Ref ref) async {
  final Dio dio = ref.watch(apiClientProvider);
  final res = await _loadAppConfigWithFallback(ref, dio);
  final Object? raw = nestEnvelopeData(res.data);
  if (raw is! Map) {
    return const StorefrontAppConfig(
      allowGuestAccess: false,
      showPricesToGuest: false,
      allowGuestCart: false,
      enableRepeatOrder: true,
      enableCreditView: true,
      enableNotifications: true,
      defaultHomeLayout: 'grid',
      showBanner: true,
      selectedLanguageCode: 'en',
      languageContract: LocalizationContract(
        languageCode: 'en',
        locale: 'en_IN',
        direction: TextDirection.ltr,
        revision: 0,
        supportedLanguages: enterpriseSupportedLanguages,
        source: 'tenant_app_settings.selected_language_code',
      ),
    );
  }
  return StorefrontAppConfig.fromJson(Map<String, dynamic>.from(raw));
});

Future<Response<Map<String, dynamic>>> _loadAppConfigWithFallback(
  Ref ref,
  Dio dio,
) async {
  try {
    final response =
        await dio.get<Map<String, dynamic>>('/storefront/app-config');
    return response;
  } on DioException catch (error) {
    if (!_canTryLocalhostBridge(error)) rethrow;
    for (final String baseUrl in _localBackendFallbacks(dio.options.baseUrl)) {
      final Dio fallbackDio = _cloneForBaseUrl(dio, baseUrl);
      try {
        final response = await fallbackDio.get<Map<String, dynamic>>(
          '/storefront/app-config',
        );
        _rememberWorkingBase(ref, baseUrl);
        return response;
      } on DioException catch (fallbackError) {
        if (!_canTryLocalhostBridge(fallbackError)) rethrow;
      }
    }
    rethrow;
  }
}

bool _canTryLocalhostBridge(DioException error) {
  return error.type == DioExceptionType.connectionTimeout ||
      error.type == DioExceptionType.receiveTimeout ||
      error.type == DioExceptionType.connectionError;
}

List<String> _localBackendFallbacks(String currentBaseUrl) {
  if (!kDebugMode) return const <String>[];
  final Uri? current = Uri.tryParse(currentBaseUrl);
  if (current == null || current.port != 3000) return const <String>[];

  final String path = current.path.replaceAll(RegExp(r'/$'), '');
  final String suffix = path.isEmpty ? '/api/v1' : path;
  final Set<String> bases = <String>{
    'http://127.0.0.1:3000$suffix',
    'http://localhost:3000$suffix',
    'http://10.0.2.2:3000$suffix',
  };
  bases.remove(currentBaseUrl.replaceAll(RegExp(r'/$'), ''));
  return bases.toList(growable: false);
}

Dio _cloneForBaseUrl(Dio source, String baseUrl) {
  final Dio dio = Dio(
    source.options.copyWith(
      baseUrl: baseUrl.replaceAll(RegExp(r'/$'), ''),
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 12),
    ),
  );
  dio.interceptors.addAll(source.interceptors);
  return dio;
}

void _rememberWorkingBase(Ref ref, String baseUrl) {
  final String normalized = baseUrl.trim().replaceAll(RegExp(r'/$'), '');
  if (normalized.isEmpty) return;
  final current = ref.read(activeApiBaseUrlProvider);
  if (current != normalized) {
    ref.read(activeApiBaseUrlProvider.notifier).state = normalized;
  }
}
