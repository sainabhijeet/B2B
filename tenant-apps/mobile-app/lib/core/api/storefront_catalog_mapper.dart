import '../../shared/models/models.dart';

List<Product> mapStorefrontProducts(
  List<dynamic> rows, {
  required String apiBaseUrl,
}) {
  return rows
      .whereType<Map>()
      .map((Map row) => _mapProduct(row, apiBaseUrl: apiBaseUrl))
      .toList(growable: false);
}

List<Category> mapStorefrontCategories(
  List<dynamic> rows, {
  required String apiBaseUrl,
}) {
  return rows.whereType<Map>().map((Map row) {
    return Category(
      id: _text(row['id'], fallback: row['slug'] ?? row['name']),
      name: _text(row['name']),
      slug: _optionalText(row['slug']),
      imageUrl: resolveStorefrontMediaUrl(
        row['imageUrl'] ??
            row['image_url'] ??
            row['thumbnailUrl'] ??
            row['thumbnail_url'],
        apiBaseUrl: apiBaseUrl,
      ),
    );
  }).toList(growable: false);
}

Product _mapProduct(Map row, {required String apiBaseUrl}) {
  final Object? category = row['category'];
  final Map categoryMap =
      category is Map ? category : const <String, dynamic>{};
  final Object? categoryId = row['categorySlug'] ??
      row['category_slug'] ??
      row['categoryId'] ??
      row['category_id'] ??
      categoryMap['slug'] ??
      categoryMap['id'] ??
      categoryMap['name'] ??
      '';
  final List<ProductVariant> variants = _parseVariants(row);
  final List<PriceSlab> slabs = <PriceSlab>[
    ..._parseSlabs(row['priceSlabs'] ?? row['price_slabs']),
    for (final ProductVariant variant in variants)
      ..._parseSlabs(
        row['variantPriceSlabs'] ?? row['variant_price_slabs'],
        variantId: variant.id,
      ),
  ];

  return Product(
    id: _text(row['id'], fallback: row['slug'] ?? row['sku']),
    name: _text(row['name'], fallback: 'Product'),
    slug: _optionalText(row['slug']),
    price: _money(row['price']),
    categoryId: '$categoryId',
    imageUrl: resolveStorefrontMediaUrl(
      row['imageUrl'] ??
          row['image_url'] ??
          row['thumbnailUrl'] ??
          row['thumbnail_url'],
      apiBaseUrl: apiBaseUrl,
    ),
    description: _optionalText(
      row['description'] ?? row['shortDescription'] ?? row['short_description'],
    ),
    sku: _optionalText(row['sku']),
    brand: _optionalText(row['brandName'] ?? row['brand_name'] ?? row['brand']),
    packSize: _optionalText(row['packSize'] ?? row['pack_size']),
    unit: _optionalText(row['unit']),
    stockQuantity: _optionalInt(
      row['stockQuantity'] ??
          row['stock_quantity'] ??
          row['stock'] ??
          row['availableStock'],
    ),
    variants: variants,
    priceSlabs: slabs,
    moq: _int(row['moq'] ?? row['minimumOrderQuantity'], 1),
    gstRate: _money(row['gstRate'] ?? row['gst_rate'] ?? row['taxRate']) ?? 0,
  );
}

Product mergeStorefrontProductDetail(
  Product base,
  Object? raw, {
  required String apiBaseUrl,
}) {
  if (raw is! Map) return base;
  final Map data = raw;
  final Map product = data['product'] is Map
      ? data['product'] as Map
      : const <String, dynamic>{};
  final List variants =
      data['variants'] is List ? data['variants'] as List : const [];
  final List images =
      data['images'] is List ? data['images'] as List : const [];
  final Object? firstImage = images.whereType<Map>().isEmpty
      ? null
      : images.whereType<Map>().first['url'];

  return Product(
    id: _text(product['id'], fallback: base.id),
    name: _text(product['name'], fallback: base.name),
    slug: _optionalText(product['slug']) ?? base.slug,
    price: base.price,
    categoryId: _text(product['categorySlug'], fallback: base.categoryId),
    imageUrl: resolveStorefrontMediaUrl(firstImage, apiBaseUrl: apiBaseUrl) ??
        base.imageUrl,
    description: _optionalText(product['description']) ?? base.description,
    sku: _optionalText(product['sku']) ?? base.sku,
    brand: _optionalText(product['brand']) ?? base.brand,
    packSize: base.packSize,
    unit: base.unit,
    stockQuantity: base.stockQuantity,
    variants: variants.whereType<Map>().map((Map variant) {
      final Object? attrs = variant['attributesJson'] ?? variant['attributes'];
      final Map<String, String> attributes = attrs is Map
          ? attrs.map(
              (Object? key, Object? value) =>
                  MapEntry('$key', value?.toString() ?? ''),
            )
          : const <String, String>{};
      return ProductVariant(
        id: _text(variant['id']),
        name: _text(
          attributes['packSize'] ??
              attributes['pack_size'] ??
              variant['name'] ??
              variant['sku'],
          fallback: 'Variant',
        ),
        sku: _optionalText(variant['sku']),
        price: _money(variant['price']),
        moq: _int(variant['moq'], 1),
        stockQuantity: _optionalInt(variant['stockQuantity']),
        unit: _optionalText(attributes['unit']),
        packSize:
            _optionalText(attributes['packSize'] ?? attributes['pack_size']),
        attributes: attributes,
      );
    }).toList(growable: false),
    priceSlabs: base.priceSlabs,
    moq: base.moq,
    gstRate: base.gstRate,
  );
}

List<ProductVariant> _parseVariants(Map row) {
  final Object? rawVariants = row['variants'] ?? row['productVariants'];
  if (rawVariants is! List) return const <ProductVariant>[];
  return rawVariants.whereType<Map>().map((Map variant) {
    final Object? rawAttributes =
        variant['attributes'] ?? variant['attributeValues'];
    final Map<String, String> attributes = rawAttributes is Map
        ? rawAttributes.map(
            (Object? key, Object? value) =>
                MapEntry('$key', value?.toString() ?? ''),
          )
        : const <String, String>{};
    return ProductVariant(
      id: _text(variant['id'], fallback: variant['sku'] ?? row['id']),
      name: _text(
        variant['name'] ?? variant['title'] ?? variant['sku'] ?? row['name'],
        fallback: 'Variant',
      ),
      sku: _optionalText(variant['sku']),
      price: _money(
        variant['price'] ??
            variant['salePrice'] ??
            variant['sale_price'] ??
            row['price'],
      ),
      moq: _int(variant['moq'] ?? variant['minimumOrderQuantity'], 1),
      stockQuantity: _optionalInt(
        variant['stockQuantity'] ??
            variant['stock_quantity'] ??
            variant['stock'] ??
            row['stockQuantity'],
      ),
      unit: _optionalText(variant['unit'] ?? row['unit']),
      packSize: _optionalText(variant['packSize'] ?? variant['pack_size']),
      attributes: attributes,
    );
  }).toList(growable: false);
}

List<PriceSlab> _parseSlabs(Object? raw, {String? variantId}) {
  if (raw is! List) return const <PriceSlab>[];
  return raw.whereType<Map>().map((Map slab) {
    return PriceSlab(
      variantId: _optionalText(
        slab['variantId'] ?? slab['variant_id'] ?? variantId,
      ),
      minQty: _int(slab['minQty'] ?? slab['min_qty'] ?? slab['quantity'], 1),
      price: _money(
            slab['price'] ??
                slab['unitPrice'] ??
                slab['unit_price'] ??
                slab['amount'],
          ) ??
          0,
      label: _optionalText(slab['label']),
    );
  }).toList(growable: false);
}

String? resolveStorefrontMediaUrl(
  Object? raw, {
  required String apiBaseUrl,
}) {
  final String value = raw?.toString().trim() ?? '';
  if (value.isEmpty) return null;
  final String lower = value.toLowerCase();
  if (lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('data:') ||
      value.startsWith('assets/')) {
    return value;
  }
  final Uri? base = Uri.tryParse(apiBaseUrl);
  if (base == null || !base.hasScheme || base.host.isEmpty) return value;
  if (value.startsWith('/')) {
    return base.replace(path: value, query: null).toString();
  }
  final String apiPath = base.path.replaceFirst(RegExp(r'/api/v\d+/?$'), '');
  final String normalizedPath = <String>[
    if (apiPath.isNotEmpty) apiPath,
    value,
  ].join('/').replaceAll(RegExp(r'/+'), '/');
  return base.replace(path: normalizedPath, query: null).toString();
}

double? _money(Object? raw) {
  if (raw == null) return null;
  if (raw is num) return raw.toDouble();
  final String text = raw.toString().trim();
  if (text.isEmpty) return null;
  return double.tryParse(text);
}

int _int(Object? raw, [int fallback = 0]) {
  if (raw is num) return raw.toInt();
  return int.tryParse('${raw ?? ''}') ?? fallback;
}

int? _optionalInt(Object? raw) {
  if (raw == null) return null;
  if (raw is num) return raw.toInt();
  return int.tryParse('$raw');
}

String _text(Object? raw, {Object? fallback = ''}) {
  final String value = raw?.toString().trim() ?? '';
  if (value.isNotEmpty && value != 'null') return value;
  return fallback?.toString().trim() ?? '';
}

String? _optionalText(Object? raw) {
  final String value = _text(raw);
  return value.isEmpty ? null : value;
}
