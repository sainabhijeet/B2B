import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/nest_json.dart';
import '../../shared/models/models.dart';
import '../products/products_provider.dart';

class WishlistNotifier extends StateNotifier<AsyncValue<List<Product>>> {
  WishlistNotifier(this._ref) : super(const AsyncValue.loading()) {
    _load();
  }

  final Ref _ref;
  List<String> _productIds = const <String>[];

  bool contains(String productId) {
    return _productIds.contains(productId);
  }

  Future<void> refresh() => _load();

  Future<void> toggle(Product product) async {
    final token = _ref.read(authTokenProvider);
    if (token == null || token.isEmpty) {
      throw StateError('Sign in required to update wishlist.');
    }
    final wasPresent = contains(product.id);
    final previousIds = _productIds;
    final previousState = state;
    _productIds = wasPresent
        ? _productIds.where((id) => id != product.id).toList(growable: false)
        : <String>[product.id, ..._productIds];
    _emitProducts(extraProduct: wasPresent ? null : product);
    try {
      final dio = _ref.read(apiClientProvider);
      if (wasPresent) {
        await dio.delete<Map<String, dynamic>>('/wishlist/items/${product.id}');
      } else {
        await dio.post<Map<String, dynamic>>(
          '/wishlist/items',
          data: <String, dynamic>{'productId': product.id},
        );
      }
    } catch (error, stackTrace) {
      _productIds = previousIds;
      state = previousState;
      Error.throwWithStackTrace(error, stackTrace);
    }
  }

  Future<void> _load() async {
    final token = _ref.read(authTokenProvider);
    if (token == null || token.isEmpty) {
      _productIds = const <String>[];
      state = const AsyncValue.data(<Product>[]);
      return;
    }
    state = const AsyncValue.loading();
    try {
      final response =
          await _ref.read(apiClientProvider).get<Map<String, dynamic>>(
                '/wishlist',
              );
      final data = nestEnvelopeData(response.data);
      _productIds = _parseProductIds(data);
      _emitProducts();
    } catch (error, stackTrace) {
      state = AsyncValue<List<Product>>.error(error, stackTrace);
    }
  }

  List<String> _parseProductIds(dynamic data) {
    if (data is Map) {
      final ids = data['productIds'] ?? data['product_ids'];
      if (ids is List) return ids.map((id) => '$id').toList(growable: false);
    }
    if (data is List) return data.map((id) => '$id').toList(growable: false);
    return const <String>[];
  }

  void _emitProducts({Product? extraProduct}) {
    final catalog =
        _ref.read(productsProvider).valueOrNull ?? const <Product>[];
    final byId = <String, Product>{
      for (final product in catalog) product.id: product,
      if (extraProduct != null) extraProduct.id: extraProduct,
      for (final product in state.valueOrNull ?? const <Product>[])
        product.id: product,
    };
    state = AsyncValue.data(
      _productIds
          .map((id) => byId[id])
          .whereType<Product>()
          .toList(growable: false),
    );
  }
}

final StateNotifierProvider<WishlistNotifier, AsyncValue<List<Product>>>
    wishlistProvider =
    StateNotifierProvider<WishlistNotifier, AsyncValue<List<Product>>>(
  (Ref ref) {
    final notifier = WishlistNotifier(ref);
    ref.listen<String?>(authTokenProvider, (_, __) {
      notifier.refresh();
    });
    ref.listen<AsyncValue<List<Product>>>(productsProvider, (_, __) {
      notifier._emitProducts();
    });
    return notifier;
  },
);
