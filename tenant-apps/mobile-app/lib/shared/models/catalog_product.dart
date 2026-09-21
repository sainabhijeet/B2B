import 'package:flutter/foundation.dart';

/// Storefront product line — props-driven (no JSON / API here for STEP 2).
@immutable
class CatalogProduct {
  const CatalogProduct({
    required this.id,
    required this.name,
    required this.priceLabel,
    this.imageUrl,
  });

  final String id;
  final String name;
  final String priceLabel;
  final String? imageUrl;
}
