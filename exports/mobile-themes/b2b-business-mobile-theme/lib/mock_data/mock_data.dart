import '../models/mock_models.dart';

class MockData {
  const MockData._();

  static const customer = Customer(
    name: 'Himanshu',
    company: 'ABC Traders',
    city: 'Jaipur',
    pincode: '302039',
    address: 'ABC Traders, VKI Road, Jaipur, Rajasthan 302039',
  );

  static const banners = <HomeBanner>[
    HomeBanner(
      title: 'Bulk Purchase Offers',
      subtitle: 'Save more on wholesale grocery packs',
      cta: 'Shop Deals',
      asset: 'assets/images/banners/bulk_offer.svg',
    ),
    HomeBanner(
      title: 'Special Retailer Prices',
      subtitle: 'Fast-moving FMCG products at trade rates',
      cta: 'View Prices',
      asset: 'assets/images/banners/retailer_prices.svg',
    ),
    HomeBanner(
      title: 'New Product Collection',
      subtitle: 'Fresh arrivals for your daily business needs',
      cta: 'Explore',
      asset: 'assets/images/banners/new_collection.svg',
    ),
  ];

  static const categories = <Category>[
    Category(name: 'Grocery', count: 128, asset: 'assets/images/categories/grocery.svg'),
    Category(name: 'Dairy', count: 64, asset: 'assets/images/categories/dairy.svg'),
    Category(name: 'Bakery', count: 42, asset: 'assets/images/categories/bakery.svg'),
    Category(name: 'Beverages', count: 89, asset: 'assets/images/categories/beverages.svg'),
    Category(name: 'Snacks', count: 116, asset: 'assets/images/categories/snacks.svg'),
    Category(name: 'Household', count: 73, asset: 'assets/images/categories/household.svg'),
  ];

  static const products = <Product>[
    Product(id: 'p1', name: 'Amul Taaza Milk', brand: 'Amul', packSize: '500 ml', mrp: 30, price: 27, discount: 10, stock: 3, asset: 'assets/images/products/milk.svg'),
    Product(id: 'p2', name: 'Tata Salt', brand: 'Tata', packSize: '1 kg', mrp: 28, price: 25, discount: 11, stock: 32, asset: 'assets/images/products/salt.svg'),
    Product(id: 'p3', name: 'Parle-G Biscuits', brand: 'Parle', packSize: 'Family pack', mrp: 12, price: 10, discount: 17, stock: 100, asset: 'assets/images/products/biscuits.svg'),
    Product(id: 'p4', name: 'Britannia Bread', brand: 'Britannia', packSize: '400 g', mrp: 45, price: 40, discount: 11, stock: 18, asset: 'assets/images/products/bread.svg'),
    Product(id: 'p5', name: 'Thums Up', brand: 'Coca-Cola', packSize: '750 ml', mrp: 45, price: 39, discount: 13, stock: 55, asset: 'assets/images/products/beverage.svg'),
    Product(id: 'p6', name: 'Surf Excel Quick Wash', brand: 'Surf Excel', packSize: '1 kg', mrp: 145, price: 132, discount: 9, stock: 24, asset: 'assets/images/products/detergent.svg'),
  ];

  static List<CartItem> cart = <CartItem>[
    CartItem(product: products[0], quantity: 10),
    CartItem(product: products[1], quantity: 5),
    CartItem(product: products[2], quantity: 20),
  ];

  static final orders = <OrderSummary>[
    OrderSummary(
      id: 'ORD-10245',
      date: DateTime(2026, 8, 12),
      total: 4850,
      itemCount: 24,
      status: OrderStatus.delivered,
      items: <OrderItem>[
        OrderItem(product: products[0], quantity: 12),
        OrderItem(product: products[2], quantity: 40),
        OrderItem(product: products[5], quantity: 8),
      ],
    ),
    OrderSummary(
      id: 'ORD-10218',
      date: DateTime(2026, 8, 8),
      total: 2950,
      itemCount: 14,
      status: OrderStatus.processing,
      items: <OrderItem>[
        OrderItem(product: products[1], quantity: 20),
        OrderItem(product: products[4], quantity: 16),
      ],
    ),
    OrderSummary(
      id: 'ORD-10192',
      date: DateTime(2026, 8, 2),
      total: 7250,
      itemCount: 38,
      status: OrderStatus.pending,
      items: <OrderItem>[
        OrderItem(product: products[3], quantity: 18),
        OrderItem(product: products[5], quantity: 12),
      ],
    ),
  ];

  static const credit = CreditSummary(
    limit: 100000,
    used: 62500,
    outstanding: 42300,
    dueSoon: 15000,
    status: 'Good Standing',
  );

  static final creditTransactions = <CreditTransaction>[
    CreditTransaction(invoice: 'INV-1023', amount: 15500, date: DateTime(2026, 8, 12)),
    CreditTransaction(invoice: 'INV-1018', amount: 8500, date: DateTime(2026, 8, 5)),
    CreditTransaction(invoice: 'INV-1011', amount: 18300, date: DateTime(2026, 7, 28)),
  ];

  static const settings = AppSettingsData(
    appName: 'Bymin Business',
    language: 'English',
    guestCart: true,
    orders: true,
    credit: true,
    notifications: true,
  );
}
