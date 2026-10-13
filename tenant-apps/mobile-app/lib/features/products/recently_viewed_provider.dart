import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/config/build_config.dart';
import '../../shared/models/models.dart';

const int _recentlyViewedLimit = 12;

String get _storageKey {
  final tenant = BuildConfig.resolvedTenantUuid.trim().isNotEmpty
      ? BuildConfig.resolvedTenantUuid.trim()
      : BuildConfig.resolvedTenantCode.trim();
  return 'recently_viewed_products_v1:$tenant';
}

final recentlyViewedProductsProvider =
    NotifierProvider<RecentlyViewedProductsController, List<Product>>(
  RecentlyViewedProductsController.new,
);

class RecentlyViewedProductsController extends Notifier<List<Product>> {
  bool _hydrateScheduled = false;

  @override
  List<Product> build() {
    if (!_hydrateScheduled) {
      _hydrateScheduled = true;
      Future<void>.microtask(_hydrate);
    }
    return const <Product>[];
  }

  void record(Product product) {
    final next = <Product>[
      product,
      ...state.where((row) => row.id != product.id),
    ].take(_recentlyViewedLimit).toList(growable: false);
    state = next;
    unawaited(_persist(next));
  }

  Future<void> clear() async {
    state = const <Product>[];
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }

  Future<void> _hydrate() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw == null || raw.isEmpty) return;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return;
      final stored = decoded
          .whereType<Map>()
          .map((row) => _productFromJson(row.cast<String, dynamic>()))
          .whereType<Product>()
          .toList(growable: false);
      final currentIds = state.map((row) => row.id).toSet();
      state = <Product>[
        ...state,
        ...stored.where((row) => !currentIds.contains(row.id)),
      ].take(_recentlyViewedLimit).toList(growable: false);
    } catch (_) {
      // Ignore stale or malformed local history.
    }
  }

  Future<void> _persist(List<Product> products) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _storageKey,
      jsonEncode(products.map(_productToJson).toList(growable: false)),
    );
  }
}

Map<String, dynamic> _productToJson(Product product) {
  return <String, dynamic>{
    'id': product.id,
    'name': product.name,
    'slug': product.slug,
    'price': product.price,
    'categoryId': product.categoryId,
    'imageUrl': product.imageUrl,
    'description': product.description,
    'sku': product.sku,
    'brand': product.brand,
    'packSize': product.packSize,
    'unit': product.unit,
    'stockQuantity': product.stockQuantity,
    'moq': product.moq,
    'gstRate': product.gstRate,
  };
}

Product? _productFromJson(Map<String, dynamic> json) {
  final id = json['id']?.toString().trim() ?? '';
  final name = json['name']?.toString().trim() ?? '';
  if (id.isEmpty || name.isEmpty) return null;
  return Product(
    id: id,
    name: name,
    slug: _optionalText(json['slug']),
    price: _double(json['price']),
    categoryId: json['categoryId']?.toString() ?? '',
    imageUrl: _optionalText(json['imageUrl']),
    description: _optionalText(json['description']),
    sku: _optionalText(json['sku']),
    brand: _optionalText(json['brand']),
    packSize: _optionalText(json['packSize']),
    unit: _optionalText(json['unit']),
    stockQuantity: _int(json['stockQuantity']),
    moq: _int(json['moq']) ?? 1,
    gstRate: _double(json['gstRate']) ?? 0,
  );
}

String? _optionalText(Object? value) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? null : text;
}

double? _double(Object? value) {
  if (value is num) return value.toDouble();
  return double.tryParse('${value ?? ''}');
}

int? _int(Object? value) {
  if (value is num) return value.toInt();
  return int.tryParse('${value ?? ''}');
}
