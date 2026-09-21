import '../../shared/models/models.dart';

class CategoryCatalogFilter {
  const CategoryCatalogFilter._();

  static List<Product> apply({
    required List<Product> products,
    required List<Category> categories,
    required Category selectedCategory,
    String query = '',
    bool moqOnly = false,
    bool gstOnly = false,
  }) {
    final List<String> terms = query
        .trim()
        .toLowerCase()
        .split(RegExp(r'\s+'))
        .where((String term) => term.isNotEmpty)
        .toList(growable: false);

    return products.where((Product product) {
      if (moqOnly && !_hasBulkMoq(product)) return false;
      if (gstOnly && product.gstRate <= 0) return false;
      if (terms.isEmpty) return matchesCategory(product, selectedCategory);

      final Iterable<Category> productCategories = categories.where(
        (Category category) => matchesCategory(product, category),
      );
      final String searchable = <String>[
        product.name,
        product.sku ?? '',
        product.brand ?? '',
        product.categoryId,
        product.packSize ?? '',
        product.unit ?? '',
        ...product.variants.expand(
          (ProductVariant variant) => <String>[
            variant.name,
            variant.sku ?? '',
          ],
        ),
        ...productCategories.expand(
          (Category category) => <String>[
            category.name,
            category.slug ?? '',
          ],
        ),
      ].join(' ').toLowerCase();
      return terms.every(searchable.contains);
    }).toList(growable: false);
  }

  static bool matchesCategory(Product product, Category category) {
    final String productCategory = product.categoryId.trim().toLowerCase();
    final Set<String> categoryKeys = <String>{
      category.id.trim().toLowerCase(),
      category.name.trim().toLowerCase(),
      if ((category.slug ?? '').trim().isNotEmpty)
        category.slug!.trim().toLowerCase(),
    };
    return categoryKeys.contains(productCategory);
  }

  static bool _hasBulkMoq(Product product) {
    return product.moq > 1 ||
        product.variants.any((ProductVariant variant) => variant.moq > 1);
  }
}
