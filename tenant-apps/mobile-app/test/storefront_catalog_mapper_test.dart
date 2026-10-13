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

  test('uses variant-specific price slabs from product detail', () {
    final base = mapStorefrontProducts(
      <Map<String, Object?>>[
        <String, Object?>{
          'id': 'p1',
          'name': 'Rose Water Mist',
          'slug': 'rose-water-mist',
          'price': '464.00',
          'categorySlug': 'skincare',
          'variants': <Map<String, Object?>>[
            <String, Object?>{
              'id': 'v1',
              'sku': 'ROSE-100',
              'price': '464.00',
              'moq': 6,
            },
          ],
        },
      ],
      apiBaseUrl: 'http://localhost:3000/api/v1',
    ).single;

    final detail = mergeStorefrontProductDetail(
      base,
      <String, Object?>{
        'product': <String, Object?>{
          'id': 'p1',
          'name': 'Rose Water Mist',
          'slug': 'rose-water-mist',
          'categorySlug': 'skincare',
        },
        'variants': <Map<String, Object?>>[
          <String, Object?>{
            'id': 'v1',
            'sku': 'ROSE-100',
            'price': '464.00',
            'moq': 6,
            'priceSlabs': <Map<String, Object?>>[
              <String, Object?>{'minQty': 6, 'price': '464.00'},
              <String, Object?>{'minQty': 24, 'price': '440.80'},
              <String, Object?>{'minQty': 96, 'price': '417.60'},
            ],
          },
          <String, Object?>{
            'id': 'v2',
            'sku': 'ROSE-200',
            'price': '500.00',
            'moq': 4,
            'priceSlabs': <Map<String, Object?>>[],
          },
        ],
      },
      apiBaseUrl: 'http://localhost:3000/api/v1',
    );

    expect(
      detail.slabsForVariant('v1').map((row) => row.minQty).toList(),
      <int>[6, 24, 96],
    );
    expect(detail.unitPriceForQuantity(25, variantId: 'v1'), 440.80);
    expect(detail.priceSlabs.every((row) => row.variantId == 'v1'), isTrue);
    expect(detail.slabsForVariant('v2'), isEmpty);
    expect(detail.unitPriceForQuantity(25, variantId: 'v2'), 500.00);
  });
}
