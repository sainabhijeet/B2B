import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/nest_json.dart';
import '../../shared/models/models.dart';

final creditProvider = FutureProvider<CreditInfo?>((Ref ref) async {
  final String? token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) return null;

  final Dio dio = ref.watch(apiClientProvider);
  final res = await dio.get<Map<String, dynamic>>('/storefront/customer/me');
  final Object? data = nestEnvelopeData(res.data);
  if (data is! Map) return null;

  double money(dynamic raw) => double.tryParse('${raw ?? 0}') ?? 0;
  return CreditInfo(
    limit: money(data['creditLimit'] ?? data['credit_limit']),
    outstanding: money(data['creditBalance'] ?? data['credit_balance']),
  );
});
