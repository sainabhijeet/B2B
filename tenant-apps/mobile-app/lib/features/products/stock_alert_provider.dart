import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/nest_json.dart';

class StockAlertSubscription {
  const StockAlertSubscription({
    required this.id,
    required this.productId,
    required this.variantId,
  });

  final String id;
  final String productId;
  final String? variantId;

  factory StockAlertSubscription.fromJson(Map<String, dynamic> json) {
    return StockAlertSubscription(
      id: '${json['id'] ?? ''}',
      productId: '${json['productId'] ?? ''}',
      variantId:
          json['variantId'] is String ? json['variantId'] as String : null,
    );
  }
}

final stockAlertsProvider =
    FutureProvider.autoDispose<List<StockAlertSubscription>>((Ref ref) async {
  final String? token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) {
    return const <StockAlertSubscription>[];
  }
  final Response<Map<String, dynamic>> response =
      await ref.watch(apiClientProvider).get<Map<String, dynamic>>(
            '/stock-alerts',
          );
  final Object? data = nestEnvelopeData(response.data);
  if (data is! List) return const <StockAlertSubscription>[];
  return data
      .whereType<Map>()
      .map(
        (Map row) => StockAlertSubscription.fromJson(
          Map<String, dynamic>.from(row),
        ),
      )
      .toList(growable: false);
});

class StockAlertService {
  const StockAlertService(this._dio);

  final Dio _dio;

  Future<void> subscribe({
    required String productId,
    required String? variantId,
  }) async {
    await _dio.post<Map<String, dynamic>>(
      '/stock-alerts',
      data: <String, dynamic>{
        'productId': productId,
        if (variantId != null && variantId.isNotEmpty) 'variantId': variantId,
      },
    );
  }

  Future<void> cancel(String subscriptionId) async {
    await _dio.delete<Map<String, dynamic>>(
      '/stock-alerts/$subscriptionId',
    );
  }
}

final stockAlertServiceProvider = Provider<StockAlertService>(
  (Ref ref) => StockAlertService(ref.watch(apiClientProvider)),
);
