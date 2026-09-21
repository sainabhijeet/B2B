import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/nest_json.dart';
import '../../shared/models/models.dart';
import '../cart/cart_provider.dart';

bool canRequestOrderReplacement(String status) =>
    status.trim().toUpperCase() == 'DELIVERED';

bool canCancelOrder(String status) => const <String>{
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
    }.contains(status.trim().toUpperCase());

class OrdersNotifier extends StateNotifier<AsyncValue<List<OrderSummary>>> {
  OrdersNotifier(this._ref) : super(const AsyncValue.loading()) {
    _ref.listen<String?>(authTokenProvider, (_, __) => load());
    load();
  }

  final Ref _ref;

  Future<void> load({bool showLoading = true}) async {
    final token = _ref.read(authTokenProvider);
    if (token == null || token.isEmpty) {
      state = const AsyncValue.data(<OrderSummary>[]);
      return;
    }

    if (showLoading) state = const AsyncValue.loading();
    try {
      final dio = _ref.read(apiClientProvider);
      final res = await dio.get<Map<String, dynamic>>('/orders');
      final data = nestEnvelopeData(res.data);
      if (data is! List) {
        state = const AsyncValue.data(<OrderSummary>[]);
        return;
      }
      final orders = data.map((dynamic e) {
        final m = e as Map<String, dynamic>;
        return OrderSummary(
          id: '${m['id']}',
          total: double.tryParse(
                  '${m['totalAmount'] ?? m['total_amount'] ?? 0}') ??
              0,
          status: '${m['status'] ?? 'PENDING'}',
          createdAt:
              DateTime.tryParse('${m['createdAt'] ?? m['created_at']}') ??
                  DateTime.now(),
          paymentStatus:
              '${m['paymentStatus'] ?? m['payment_status'] ?? 'PENDING'}',
          paymentMode: '${m['paymentMode'] ?? m['payment_mode'] ?? 'CREDIT'}',
        );
      }).toList();
      state = AsyncValue.data(orders);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<int> addOrderToCart(OrderSummary order) async {
    final List<OrderAgainLine> lines = await orderLines(order);
    if (lines.isEmpty) return 0;
    for (final OrderAgainLine line in lines) {
      await _ref.read(cartProvider.notifier).addProduct(
            line.productId,
            quantity: line.quantity,
            fallbackProduct: line.fallbackProduct,
          );
    }
    return lines.length;
  }

  Future<List<OrderAgainLine>> orderLines(OrderSummary order) async {
    final token = _ref.read(authTokenProvider);
    if (token == null || token.isEmpty || order.id.startsWith('DEMO-')) {
      return const <OrderAgainLine>[];
    }

    final dio = _ref.read(apiClientProvider);
    final res = await dio.get<Map<String, dynamic>>('/orders/${order.id}');
    final data = nestEnvelopeData(res.data);
    if (data is! Map) return const <OrderAgainLine>[];
    final rawItems = data['items'];
    if (rawItems is! List) return const <OrderAgainLine>[];
    return rawItems
        .whereType<Map>()
        .map((Map raw) {
          final Map<String, dynamic> row = Map<String, dynamic>.from(raw);
          final String productId =
              '${row['productId'] ?? row['product_id'] ?? ''}'.trim();
          if (productId.isEmpty) return null;
          final int quantity = (row['quantity'] as num?)?.toInt() ??
              int.tryParse('${row['quantity'] ?? 1}') ??
              1;
          return OrderAgainLine(
            productId: productId,
            quantity: quantity < 1 ? 1 : quantity,
          );
        })
        .whereType<OrderAgainLine>()
        .toList(growable: false);
  }
}

final ordersProvider =
    StateNotifierProvider<OrdersNotifier, AsyncValue<List<OrderSummary>>>(
  (Ref ref) => OrdersNotifier(ref),
);
