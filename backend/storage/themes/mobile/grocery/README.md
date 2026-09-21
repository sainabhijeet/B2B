# Grocery Distributor Mobile Theme Pack

Complete Grocery / FMCG B2B mobile theme for the existing Flutter + Riverpod storefront app.

## What Is Included

- Material 3 green and white grocery design tokens with light and dark mode.
- Flutter theme extension, reusable grocery widgets, and screen wrappers for splash, login, home, categories, subcategories, product listing, product details, search, wishlist, cart, checkout, orders, order details, invoice, RFQ, profile, address book, business profile, GST, credit, notifications, help/support, and settings.
- Seed files for categories, subcategories, brands, products, and banners.
- SVG production-style grocery assets for hero banners, categories, brand marks, product thumbnails, galleries, empty states, and icons.

## Integration

1. Copy `assets/` into your Flutter app asset bundle or upload these files to the same CDN/static storage used by your storefront theme engine.
2. Register these asset folders in `pubspec.yaml` if served locally:
   - `assets/banners/`
   - `assets/categories/`
   - `assets/products/`
   - `assets/brands/`
   - `assets/icons/`
3. Import `flutter/theme_extensions.dart` and add `groceryThemeData(Brightness.light)` / `groceryThemeData(Brightness.dark)` to your current dynamic theme bridge if you want the Dart tokens applied directly.
4. Copy `flutter/widgets/` and `flutter/screens/` into your app, keeping the `ridego` package imports. The screens deliberately use existing Riverpod providers such as `productsProvider`, `categoriesProvider`, `cartProvider`, `orderTimelineProvider`, `invoiceCenterProvider`, `rfqProvider`, and the existing `AuthScreen`.
5. Import the JSON seed files using your existing backend/admin seed importer. Product fields match the app mapper: `image_url`, `thumbnail_url`, `price`, `brand`, `pack_size`, `stock_quantity`, `moq`, `gst_rate`, `price_slabs`, and category IDs/slugs.

## Notes

- The OTP login flow is not replaced. `GroceryLoginScreen` delegates to your existing `AuthScreen`.
- No screen uses hardcoded dummy product/category lists. Screen data comes from your existing providers; the JSON files are backend seed input.
- Brand names are included as requested. The included SVG brand assets are clean text badges for storefront display and can be replaced by licensed official artwork if required by your brand policy.
