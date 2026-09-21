# B2B Business Mobile Theme

Production-ready Flutter UI theme for an existing B2B commerce mobile app.

This package is a UI/UX layer only. It does not replace backend APIs, auth logic, repositories, routing, business rules, or existing models. The included mock data is only for the standalone demo.

## Bottom Navigation Screens

1. Home: greeting, location, search, banners, categories, recommended products, deals, recently ordered.
2. Cart: cart item cards, quantity controls, delete action, price summary, checkout CTA, empty/login-ready states.
3. Order: recent orders, status filters, order cards, view details, reorder UI action.
4. Credit: credit limit summary, usage progress, overview metrics, recent credit transactions.
5. Settings: app info, language, read-only feature switches, account/support/legal rows.
6. Login: mobile OTP request and verification UI with validation/loading/error states.

Order detail is included at `lib/screens/order_detail/order_detail_screen.dart`.

## Structure

- `lib/theme/`: colors, typography, radius, spacing, shadows, icons, ThemeData.
- `lib/models/`: UI-facing mock/demo models.
- `lib/mock_data/`: demo data for standalone preview.
- `lib/widgets/`: reusable UI components.
- `lib/screens/`: screen implementations matching the bottom navigation.
- `assets/images/`: SVG demo assets for banners, products, categories, and brand.

## Run Demo

```bash
flutter pub get
flutter run
```

## Integration Notes

Copy the relevant `theme`, `widgets`, and `screens` folders into your existing Flutter app, then replace mock data reads with your existing providers/services.

Suggested mapping:

- Products/categories: replace `MockData.products` and `MockData.categories` with your existing `productsProvider` and `categoriesProvider`.
- Cart: replace `MockData.cart` with your existing `cartProvider`; wire delete/quantity actions to current cart methods.
- Orders: replace `MockData.orders` with your existing orders API/provider; keep `OrderCard` as the display component.
- Credit: replace `MockData.credit` and `MockData.creditTransactions` with `/storefront/customer/me` or your current credit provider.
- Settings: replace `MockData.settings` with your current storefront app config. Switches are intentionally read-only.
- Login: connect `_sendOtp` and `_verify` to your existing OTP request and verify methods.
- Navigation: use `AppBottomNavigation` inside your existing shell if you want the visual style without changing routing.

Do not change existing API contracts. This theme is designed to sit on top of the current app logic.

## State Components

Reusable state widgets are in `lib/widgets/common/state_views.dart`:

- Loading/skeleton
- Empty
- Error
- Login required
- Feature disabled
- No internet style state

## Brand Tokens

Primary brand color: `#845ADF`.

Update global styling in:

- `lib/theme/app_colors.dart`
- `lib/theme/app_typography.dart`
- `lib/theme/app_spacing.dart`
- `lib/theme/app_radius.dart`
- `lib/theme/app_theme.dart`

Avoid hardcoding colors inside screens when extending the theme.

## Quality Checklist

- All 6 bottom tabs open.
- Mock data populates every screen.
- Centralized color and typography tokens.
- Reusable cards, chips, states, bottom navigation, quantity selector.
- Assets are bundled in `pubspec.yaml`.
- Business/API logic remains separate from UI.
