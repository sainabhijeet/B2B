enum OrderStatus { pending, confirmed, processing, shipped, delivered, cancelled }

class Customer {
  const Customer({
    required this.name,
    required this.company,
    required this.city,
    required this.pincode,
    required this.address,
  });

  final String name;
  final String company;
  final String city;
  final String pincode;
  final String address;
}

class HomeBanner {
  const HomeBanner({
    required this.title,
    required this.subtitle,
    required this.cta,
    required this.asset,
  });

  final String title;
  final String subtitle;
  final String cta;
  final String asset;
}

class Category {
  const Category({
    required this.name,
    required this.count,
    required this.asset,
  });

  final String name;
  final int count;
  final String asset;
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.brand,
    required this.packSize,
    required this.mrp,
    required this.price,
    required this.discount,
    required this.stock,
    required this.asset,
  });

  final String id;
  final String name;
  final String brand;
  final String packSize;
  final double mrp;
  final double price;
  final int discount;
  final int stock;
  final String asset;
}

class CartItem {
  const CartItem({
    required this.product,
    required this.quantity,
    this.unavailable = false,
  });

  final Product product;
  final int quantity;
  final bool unavailable;

  double get total => product.price * quantity;
}

class OrderItem {
  const OrderItem({required this.product, required this.quantity});

  final Product product;
  final int quantity;
}

class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.date,
    required this.total,
    required this.itemCount,
    required this.status,
    required this.items,
  });

  final String id;
  final DateTime date;
  final double total;
  final int itemCount;
  final OrderStatus status;
  final List<OrderItem> items;
}

class CreditSummary {
  const CreditSummary({
    required this.limit,
    required this.used,
    required this.outstanding,
    required this.dueSoon,
    required this.status,
  });

  final double limit;
  final double used;
  final double outstanding;
  final double dueSoon;
  final String status;

  double get available => limit - used;
  double get usage => limit == 0 ? 0 : used / limit;
}

class CreditTransaction {
  const CreditTransaction({
    required this.invoice,
    required this.amount,
    required this.date,
  });

  final String invoice;
  final double amount;
  final DateTime date;
}

class AppSettingsData {
  const AppSettingsData({
    required this.appName,
    required this.language,
    required this.guestCart,
    required this.orders,
    required this.credit,
    required this.notifications,
  });

  final String appName;
  final String language;
  final bool guestCart;
  final bool orders;
  final bool credit;
  final bool notifications;
}
