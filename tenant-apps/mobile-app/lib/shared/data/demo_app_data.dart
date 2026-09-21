import '../models/models.dart';

const List<Category> kDemoCategories = <Category>[
  Category(
    id: 'demo-cat-fillers',
    name: 'Fillers & sealers',
    imageUrl: 'assets/images/demo_products/automatic-pouch-sealing-machine.png',
  ),
  Category(
    id: 'demo-cat-packaging',
    name: 'Packaging rolls',
    imageUrl: 'assets/images/demo_products/laminated-packaging-roll.png',
  ),
  Category(
    id: 'demo-cat-machinery',
    name: 'Machinery spares',
    imageUrl: 'assets/images/demo_products/liquid-filling-nozzle-set.png',
  ),
  Category(
    id: 'demo-cat-adhesives',
    name: 'Industrial adhesives',
    imageUrl: 'assets/images/demo_products/food-grade-carton-adhesive.png',
  ),
  Category(
    id: 'demo-cat-tools',
    name: 'Workshop tools',
    imageUrl: 'assets/images/demo_products/digital-bench-weighing-scale.png',
  ),
];

const List<Product> kDemoProducts = <Product>[
  Product(
    id: 'demo-prod-sealer-01',
    name: 'Automatic pouch sealing machine',
    price: 48500,
    categoryId: 'demo-cat-fillers',
    imageUrl: 'assets/images/demo_products/automatic-pouch-sealing-machine.png',
    description:
        'Compact automatic pouch sealing machine for small-batch packaging lines, retail packs, and distributor job work.',
    sku: 'SEAL-AUTO-01',
    brand: 'Fuse Tolk',
    packSize: '1 machine',
    unit: 'Piece',
    stockQuantity: 6,
    moq: 1,
    gstRate: 18,
    variants: <ProductVariant>[
      ProductVariant(
        id: 'demo-var-sealer-standard',
        name: 'Standard 220V',
        sku: 'SEAL-AUTO-01-STD',
        price: 48500,
        stockQuantity: 4,
      ),
      ProductVariant(
        id: 'demo-var-sealer-heavy',
        name: 'Heavy duty 440V',
        sku: 'SEAL-AUTO-01-HD',
        price: 56500,
        stockQuantity: 2,
      ),
    ],
  ),
  Product(
    id: 'demo-prod-roll-01',
    name: 'Laminated packaging roll 12 inch',
    price: 2650,
    categoryId: 'demo-cat-packaging',
    imageUrl: 'assets/images/demo_products/laminated-packaging-roll.png',
    description:
        'Food-safe laminated roll for pouch packing, sealing, and flexible packaging applications.',
    sku: 'ROLL-LAM-12',
    brand: 'PackPro',
    packSize: '12 inch roll',
    unit: 'Roll',
    stockQuantity: 24,
    moq: 5,
    gstRate: 18,
    priceSlabs: <PriceSlab>[
      PriceSlab(minQty: 5, price: 2650, label: '5+ rolls'),
      PriceSlab(minQty: 20, price: 2525, label: '20+ rolls'),
      PriceSlab(minQty: 50, price: 2450, label: '50+ rolls'),
    ],
  ),
  Product(
    id: 'demo-prod-filler-01',
    name: 'Liquid filling nozzle set',
    price: 7400,
    categoryId: 'demo-cat-machinery',
    imageUrl: 'assets/images/demo_products/liquid-filling-nozzle-set.png',
    description:
        'Stainless steel nozzle set for controlled liquid filling in packaging and production workflows.',
    sku: 'NOZZLE-LIQ-SET',
    brand: 'FlowMate',
    packSize: 'Set of 12',
    unit: 'Set',
    stockQuantity: 10,
    moq: 2,
    gstRate: 18,
  ),
  Product(
    id: 'demo-prod-adhesive-01',
    name: 'Food-grade carton adhesive',
    price: 1180,
    categoryId: 'demo-cat-adhesives',
    imageUrl: 'assets/images/demo_products/food-grade-carton-adhesive.png',
    description:
        'High-bond carton adhesive suitable for food packaging, box sealing, and paperboard assembly.',
    sku: 'ADH-FG-05',
    brand: 'BondCraft',
    packSize: '5 kg bucket',
    unit: 'Bucket',
    stockQuantity: 32,
    moq: 4,
    gstRate: 18,
    priceSlabs: <PriceSlab>[
      PriceSlab(minQty: 4, price: 1180, label: '4+ buckets'),
      PriceSlab(minQty: 12, price: 1110, label: '12+ buckets'),
      PriceSlab(minQty: 24, price: 1040, label: '24+ buckets'),
    ],
  ),
  Product(
    id: 'demo-prod-weigher-01',
    name: 'Digital bench weighing scale',
    price: 3950,
    categoryId: 'demo-cat-tools',
    imageUrl: 'assets/images/demo_products/digital-bench-weighing-scale.png',
    description:
        'Digital bench scale for warehouse weighing, packing counters, and dispatch quality checks.',
    sku: 'SCALE-BENCH-30',
    brand: 'MeasureMax',
    packSize: '30 kg capacity',
    unit: 'Piece',
    stockQuantity: 14,
    moq: 1,
    gstRate: 18,
  ),
  Product(
    id: 'demo-prod-carton-01',
    name: 'Corrugated carton box pack',
    price: 820,
    categoryId: 'demo-cat-packaging',
    imageUrl: 'assets/images/demo_products/corrugated-carton-box-pack.png',
    description:
        'Durable corrugated carton boxes for shipping, storage, and bulk order packing.',
    sku: 'CARTON-CORR-25',
    brand: 'BoxLine',
    packSize: 'Pack of 25',
    unit: 'Pack',
    stockQuantity: 48,
    moq: 6,
    gstRate: 12,
    priceSlabs: <PriceSlab>[
      PriceSlab(minQty: 6, price: 820, label: '6+ packs'),
      PriceSlab(minQty: 24, price: 780, label: '24+ packs'),
    ],
  ),
];

const List<CartItem> kDemoCartItems = <CartItem>[
  CartItem(
    lineId: 'demo-cart-1',
    productId: 'demo-prod-roll-01',
    name: 'Laminated packaging roll 12 inch',
    quantity: 2,
    unitPrice: 2650,
    imageUrl: 'assets/images/demo_products/laminated-packaging-roll.png',
    moq: 5,
    stockQuantity: 24,
    priceSlabs: <PriceSlab>[
      PriceSlab(minQty: 5, price: 2650, label: '5+ rolls'),
      PriceSlab(minQty: 20, price: 2525, label: '20+ rolls'),
    ],
  ),
  CartItem(
    lineId: 'demo-cart-2',
    productId: 'demo-prod-adhesive-01',
    name: 'Food-grade carton adhesive',
    quantity: 4,
    unitPrice: 1180,
    imageUrl: 'assets/images/demo_products/food-grade-carton-adhesive.png',
    moq: 4,
    stockQuantity: 32,
    priceSlabs: <PriceSlab>[
      PriceSlab(minQty: 4, price: 1180, label: '4+ buckets'),
      PriceSlab(minQty: 12, price: 1110, label: '12+ buckets'),
    ],
  ),
];

final List<OrderSummary> kDemoOrders = <OrderSummary>[
  OrderSummary(
    id: 'DEMO-1004',
    total: 10220,
    status: 'PROCESSING',
    createdAt: DateTime.now().subtract(const Duration(days: 1, hours: 3)),
  ),
  OrderSummary(
    id: 'DEMO-1003',
    total: 48500,
    status: 'CONFIRMED',
    createdAt: DateTime.now().subtract(const Duration(days: 4)),
  ),
  OrderSummary(
    id: 'DEMO-1002',
    total: 8240,
    status: 'DELIVERED',
    createdAt: DateTime.now().subtract(const Duration(days: 9)),
  ),
];

const CreditInfo kDemoCreditInfo = CreditInfo(
  limit: 150000,
  outstanding: 37250,
);
