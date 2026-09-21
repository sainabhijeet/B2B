import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/core/api/api_client.dart';
import 'package:ridego/core/config/storefront_app_config_provider.dart';

void main() {
  test('primary app-config request does not invalidate its own provider',
      () async {
    final adapter = _AppConfigAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test/api/v1'))
      ..httpClientAdapter = adapter;
    final container = ProviderContainer(
      overrides: <Override>[
        apiClientProvider.overrideWithValue(dio),
      ],
    );
    addTearDown(container.dispose);

    final config = await container.read(storefrontAppConfigProvider.future);

    expect(config.selectedLanguageCode, 'en');
    expect(adapter.requestCount, 1);
    expect(container.read(activeApiBaseUrlProvider), isNull);
  });
}

class _AppConfigAdapter implements HttpClientAdapter {
  int requestCount = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requestCount += 1;
    return ResponseBody.fromString(
      jsonEncode(<String, dynamic>{
        'success': true,
        'data': <String, dynamic>{
          'allowGuestAccess': false,
          'showPricesToGuest': false,
          'allowGuestCart': false,
          'enableRepeatOrder': true,
          'enableCreditView': true,
          'enableNotifications': true,
          'defaultHomeLayout': 'grid',
          'showBanner': true,
          'selectedLanguageCode': 'en',
        },
      }),
      200,
      headers: <String, List<String>>{
        Headers.contentTypeHeader: <String>[Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
