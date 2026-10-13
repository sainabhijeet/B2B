import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/features/categories/category_catalog_filter.dart';
import 'package:ridego/shared/models/models.dart';

void main() {
  const Category beverages = Category(
    id: 'category-1',
    name: 'Beverages',
    slug: 'beverages',
  );
  const Category staples = Category(
    id: 'category-2',
    name: 'Rice and Flour',
    slug: 'rice-flour',
  );
  const List<Product> products = <Product>[
    Product(
      id: 'product-1',
      name: 'Pepsi 750ml',
      categoryId: 'beverages',
      sku: 'PEP-750',
      brand: 'Pepsi',
      moq: 8,
      gstRate: 18,
    ),
    Product(
      id: 'product-2',
      name: 'Premium Atta',
      categoryId: 'category-2',
      sku: 'ATT-10',
      brand: 'Fortune',
      moq: 1,
      gstRate: 0,
      variants: <ProductVariant>[
        ProductVariant(
          id: 'variant-1',
          name: '10 kg bag',
          sku: 'FORT-ATT-10',
          moq: 4,
        ),
      ],
    ),
  ];

  test('empty search returns products from the selected category', () {
    final result = CategoryCatalogFilter.apply(
      products: products,
      categories: const <Category>[beverages, staples],
      selectedCategory: beverages,
    );

    expect(result.map((Product product) => product.id), <String>['product-1']);
  });

  test('search matches SKU, brand, category, and variant SKU', () {
    for (final query in <String>[
      'ATT-10',
      'Fortune',
      'Rice Flour',
      'FORT-ATT-10',
    ]) {
      final result = CategoryCatalogFilter.apply(
        products: products,
        categories: const <Category>[beverages, staples],
        selectedCategory: beverages,
        query: query,
      );

      expect(
          result.map((Product product) => product.id), <String>['product-2']);
    }
  });
}
