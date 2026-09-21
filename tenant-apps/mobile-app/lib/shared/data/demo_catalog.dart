import '../models/catalog_product.dart';

/// Static demo catalog for layouts until API/theme wiring (STEP 2).
final List<CatalogProduct> kDemoCatalogProducts = <CatalogProduct>[
  const CatalogProduct(id: '1', name: 'Wheat atta 10 kg', priceLabel: '₹420'),
  const CatalogProduct(id: '2', name: 'Sunflower oil 5 L', priceLabel: '₹890'),
  const CatalogProduct(id: '3', name: 'Toor dal 1 kg', priceLabel: '₹142'),
  const CatalogProduct(id: '4', name: 'Sugar 5 kg', priceLabel: '₹265'),
  const CatalogProduct(id: '5', name: 'Tea 250 g', priceLabel: '₹175'),
  const CatalogProduct(id: '6', name: 'Biscuit family pack', priceLabel: '₹95'),
];

final List<String> kDemoCategories = <String>[
  'All',
  'FMCG',
  'Snacks',
  'Beverages',
  'Staples',
];
