class Category {
  const Category({
    required this.id,
    required this.name,
    this.slug,
    this.imageUrl,
  });

  final String id;
  final String name;
  final String? slug;
  final String? imageUrl;
}

class Product {
  const Product({
    required this.id,
    required this.name,
    this.slug,
    this.price,
    required this.categoryId,
    this.imageUrl,
    this.description,
    this.sku,
    this.brand,
    this.packSize,
    this.unit,
    this.stockQuantity,
    this.variants = const <ProductVariant>[],
    this.priceSlabs = const <PriceSlab>[],
    this.moq = 1,
    this.gstRate = 0,
  });
  final String id;
  final String name;
  final String? slug;

  /// Null when distributor hides prices for guests (`show_prices_to_guest: false`).
  final double? price;
  final String categoryId;
  final String? imageUrl;
  final String? description;
  final String? sku;
  final String? brand;
  final String? packSize;
  final String? unit;
  final int? stockQuantity;
  final List<ProductVariant> variants;
  final List<PriceSlab> priceSlabs;
  final int moq;
  final double gstRate;

  ProductVariant? get defaultVariant =>
      variants.isEmpty ? null : variants.first;

  List<PriceSlab> slabsForVariant(String? variantId) {
    if (variantId != null) {
      final List<PriceSlab> variantSlabs = priceSlabs
          .where((PriceSlab slab) => slab.variantId == variantId)
          .toList(growable: false);
      if (variantSlabs.isNotEmpty) return variantSlabs;
    }
    return priceSlabs
        .where((PriceSlab slab) => slab.variantId == null)
        .toList(growable: false);
  }

  double? unitPriceForQuantity(int quantity, {String? variantId}) {
    ProductVariant? variant;
    for (final ProductVariant row in variants) {
      if (row.id == variantId) {
        variant = row;
        break;
      }
    }
    final List<PriceSlab> slabs = slabsForVariant(variantId)
        .where((PriceSlab slab) => quantity >= slab.minQty)
        .toList(growable: false)
      ..sort((PriceSlab a, PriceSlab b) => b.minQty.compareTo(a.minQty));
    if (slabs.isNotEmpty) return slabs.first.price;
    return variant?.price ?? price;
  }
}

class ProductVariant {
  const ProductVariant({
    required this.id,
    required this.name,
    this.sku,
    this.price,
    this.moq = 1,
    this.stockQuantity,
    this.unit,
    this.packSize,
    this.attributes = const <String, String>{},
  });

  final String id;
  final String name;
  final String? sku;
  final double? price;
  final int moq;
  final int? stockQuantity;
  final String? unit;
  final String? packSize;
  final Map<String, String> attributes;
}

class PriceSlab {
  const PriceSlab({
    required this.minQty,
    required this.price,
    this.variantId,
    this.label,
  });

  final int minQty;
  final double price;
  final String? variantId;
  final String? label;
}

class CartItem {
  const CartItem({
    this.lineId,
    required this.productId,
    required this.name,
    required this.quantity,
    required this.unitPrice,
    this.variantId,
    this.variantName,
    this.imageUrl,
    this.taxRate = 0,
    this.moq = 1,
    this.stockQuantity,
    this.priceSlabs = const <PriceSlab>[],
  });

  /// Server `cart_items.id` when loaded from Nest `GET /cart`.
  final String? lineId;
  final String productId;
  final String name;
  final int quantity;
  final double unitPrice;
  final String? variantId;
  final String? variantName;
  final String? imageUrl;
  final double taxRate;
  final int moq;
  final int? stockQuantity;
  final List<PriceSlab> priceSlabs;

  double get lineTotal => quantity * unitPrice;
  double get taxAmount => lineTotal * taxRate / 100;
  bool get belowMoq => quantity < moq;
  bool get exceedsStock =>
      stockQuantity != null && stockQuantity! >= 0 && quantity > stockQuantity!;

  CartItem copyWith({int? quantity, double? unitPrice}) {
    return CartItem(
      lineId: lineId,
      productId: productId,
      name: name,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      variantId: variantId,
      variantName: variantName,
      imageUrl: imageUrl,
      taxRate: taxRate,
      moq: moq,
      stockQuantity: stockQuantity,
      priceSlabs: priceSlabs,
    );
  }
}

class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.total,
    required this.status,
    required this.createdAt,
    this.paymentStatus,
    this.paymentMode,
    this.shipmentStatus,
    this.invoiceId,
  });
  final String id;
  final double total;
  final String status;
  final DateTime createdAt;
  final String? paymentStatus;
  final String? paymentMode;
  final String? shipmentStatus;
  final String? invoiceId;
}

class OrderAgainLine {
  const OrderAgainLine({
    required this.productId,
    required this.quantity,
    this.fallbackProduct,
  });

  final String productId;
  final int quantity;
  final Product? fallbackProduct;
}

class CreditInfo {
  const CreditInfo({
    required this.limit,
    required this.outstanding,
  });
  final double limit;
  final double outstanding;
  double get usage => limit == 0 ? 0 : outstanding / limit;
}

class BusinessProfile {
  const BusinessProfile({
    required this.companyLegalName,
    required this.gstin,
    required this.verified,
    this.status = 'UNVERIFIED',
    this.message,
    this.certificateUrl,
    this.certificateFileName,
    this.verifiedAt,
  });

  final String companyLegalName;
  final String gstin;
  final bool verified;
  final String status;
  final String? message;
  final String? certificateUrl;
  final String? certificateFileName;
  final DateTime? verifiedAt;
}

class DistributorPaymentSettings {
  const DistributorPaymentSettings({
    required this.accountHolderName,
    required this.bankName,
    required this.accountNumber,
    required this.ifsc,
    required this.branch,
    required this.upiId,
  });

  final String accountHolderName;
  final String bankName;
  final String accountNumber;
  final String ifsc;
  final String branch;
  final String upiId;

  String upiUri({
    double? amount,
    String? orderNumber,
    String? retailerName,
    String? transactionNote,
  }) {
    final encodedName = Uri.encodeComponent(accountHolderName);
    final List<String> parts = <String>[
      'pa=$upiId',
      'pn=$encodedName',
    ];
    if (amount != null && amount > 0) {
      parts.add('am=${amount.toStringAsFixed(2)}');
      parts.add('cu=INR');
    }
    final String note = transactionNote?.trim().isNotEmpty == true
        ? transactionNote!.trim()
        : [
            if (orderNumber?.trim().isNotEmpty == true)
              'Order ${orderNumber!.trim()}',
            if (retailerName?.trim().isNotEmpty == true)
              'from ${retailerName!.trim()}',
          ].join(' ');
    if (note.isNotEmpty) parts.add('tn=${Uri.encodeComponent(note)}');
    if (orderNumber?.trim().isNotEmpty == true) {
      parts.add('tr=${Uri.encodeComponent(orderNumber!.trim())}');
    }
    return 'upi://pay?${parts.join('&')}';
  }
}

class PaymentSubmission {
  const PaymentSubmission({
    required this.orderId,
    required this.method,
    required this.status,
    this.utrNumber,
    this.proofPath,
  });

  final String orderId;
  final String method;
  final String status;
  final String? utrNumber;
  final String? proofPath;
}

class InvoiceDocument {
  const InvoiceDocument({
    required this.id,
    required this.orderId,
    required this.invoiceNumber,
    required this.total,
    required this.gstTotal,
    required this.createdAt,
    this.pdfUrl,
  });

  final String id;
  final String orderId;
  final String invoiceNumber;
  final double total;
  final double gstTotal;
  final DateTime createdAt;
  final String? pdfUrl;
}

class OrderTimelineEvent {
  const OrderTimelineEvent({
    required this.title,
    required this.status,
    required this.createdAt,
    this.description,
  });

  final String title;
  final String status;
  final DateTime createdAt;
  final String? description;
}

class RfqRequest {
  const RfqRequest({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.status,
    required this.createdAt,
    this.targetPrice,
    this.message,
  });

  final String id;
  final String productId;
  final String productName;
  final int quantity;
  final String status;
  final DateTime createdAt;
  final double? targetPrice;
  final String? message;
}

class Quotation {
  const Quotation({
    required this.id,
    required this.rfqId,
    required this.productName,
    required this.quantity,
    required this.quotedPrice,
    required this.status,
    required this.validUntil,
  });

  final String id;
  final String rfqId;
  final String productName;
  final int quantity;
  final double quotedPrice;
  final String status;
  final DateTime validUntil;
}

class CreditLedgerEntry {
  const CreditLedgerEntry({
    required this.id,
    required this.type,
    required this.amount,
    required this.balance,
    required this.createdAt,
    this.dueDate,
    this.reference,
  });

  final String id;
  final String type;
  final double amount;
  final double balance;
  final DateTime createdAt;
  final DateTime? dueDate;
  final String? reference;
}
