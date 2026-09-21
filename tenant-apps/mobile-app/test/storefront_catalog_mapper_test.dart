import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/core/api/storefront_catalog_mapper.dart';

void main() {
  test('maps storefront products with variants, slabs, and media URLs', () {
    final products = mapStorefrontProducts(
      <Map<String, Object?>>[
        <String, Object?>{
          'id': 'p1',
          'name': 'Trade Sugar',
          'price': '240.50',
          'categorySlug': 'grocery',
          'thumbnailUrl': '/uploads/products/sugar.png',
          'brand': 'Acme',
          'packSize': '5 kg',
          'stockQuantity': 12,
          'moq': 2,
          'gstRate': '5',
          'variants': <Map<String, Object?>>[
            <String, Object?>{
              'id': 'v1',
              'sku': 'SUGAR-5KG',
              'price': '238',
              'moq': 3,
              'attributes': <String, Object?>{'pack': '5 kg'},
            },
          ],
          'priceSlabs': <Map<String, Object?>>[
            <String, Object?>{'minQty': 10, 'price': '230'},
          ],
        },
      ],
      apiBaseUrl: 'http://localhost:3000/api/v1',
    );

    expect(products, hasLength(1));
    expect(products.first.id, 'p1');
    expect(products.first.price, 240.5);
    expect(products.first.categoryId, 'grocery');
    expect(
      products.first.imageUrl,
      'http://localhost:3000/uploads/products/sugar.png',
    );
    expect(products.first.variants.single.id, 'v1');
    expect(products.first.variants.single.moq, 3);
    expect(products.first.priceSlabs.single.price, 230);
  });

  test('maps storefront categories with stable fallback ids', () {
    final categories = mapStorefrontCategories(
      <Map<String, Object?>>[
        <String, Object?>{
          'name': 'Beverages',
          'slug': 'beverages',
          'image_url': 'assets/images/demo_products/beverage.png',
        },
      ],
      apiBaseUrl: 'http://localhost:3000/api/v1',
    );

    expect(categories.single.id, 'beverages');
    expect(categories.single.name, 'Beverages');
    expect(categories.single.slug, 'beverages');
    expect(
      categories.single.imageUrl,
      'assets/images/demo_products/beverage.png',
    );
  });
}
