import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/nest_json.dart';
import '../../core/api/storefront_catalog_mapper.dart';
import '../../shared/models/models.dart';

final productsPageProvider = StateProvider<int>((_) => 1);
final productsSearchProvider = StateProvider<String>((_) => '');

final productsTotalProvider = FutureProvider<int>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get<Map<String, dynamic>>(
    '/storefront/products',
    queryParameters: const <String, dynamic>{'page': 1, 'limit': 1},
  );
  final data = nestEnvelopeData(res.data);
  if (data is! Map) return 0;
  final meta = data['meta'];
  if (meta is! Map) return 0;
  final rawTotal = meta['total'];
  return rawTotal is num ? rawTotal.toInt() : int.tryParse('$rawTotal') ?? 0;
});

final productsProvider = FutureProvider<List<Product>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final page = ref.watch(productsPageProvider);
  final q = ref.watch(productsSearchProvider).trim();

  final query = <String, dynamic>{
    'page': page,
    'limit': 20,
  };
  if (q.isNotEmpty) query['q'] = q;

  final res = await dio.get<Map<String, dynamic>>(
    '/storefront/products',
    queryParameters: query,
  );
  final data = nestEnvelopeData(res.data);
  if (data is! Map) {
    throw const FormatException('Products response is invalid.');
  }
  final rows = (data['items'] as List<dynamic>? ?? <dynamic>[]);
  return mapStorefrontProducts(rows, apiBaseUrl: dio.options.baseUrl);
});

final categoryCatalogProductsProvider =
    FutureProvider<List<Product>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get<Map<String, dynamic>>(
    '/storefront/products',
    queryParameters: const <String, dynamic>{
      'page': 1,
      'limit': 100,
    },
  );
  final data = nestEnvelopeData(res.data);
  if (data is! Map) {
    throw const FormatException('Products response is invalid.');
  }
  final rows = data['items'] as List<dynamic>? ?? <dynamic>[];
  return mapStorefrontProducts(rows, apiBaseUrl: dio.options.baseUrl);
});

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get<Map<String, dynamic>>(
    '/storefront/categories',
    queryParameters: const {'channel': 'app'},
  );
  final data = nestEnvelopeData(res.data);
  if (data is! Map) {
    throw const FormatException('Categories response is invalid.');
  }
  final rows = (data['items'] as List<dynamic>? ?? <dynamic>[]);
  return mapStorefrontCategories(rows, apiBaseUrl: dio.options.baseUrl);
});

final productDetailProvider =
    FutureProvider.family<Product, Product>((ref, product) async {
  final String slug = product.slug?.trim() ?? '';
  if (slug.isEmpty) return product;
  final dio = ref.watch(apiClientProvider);
  final quantity = product.moq < 1 ? 1 : product.moq;
  final res = await dio.get<Map<String, dynamic>>(
    '/storefront/products/$slug',
    queryParameters: <String, dynamic>{'qty': quantity},
  );
  final data = nestEnvelopeData(res.data);
  return mergeStorefrontProductDetail(
    product,
    data,
    apiBaseUrl: dio.options.baseUrl,
  );
});
