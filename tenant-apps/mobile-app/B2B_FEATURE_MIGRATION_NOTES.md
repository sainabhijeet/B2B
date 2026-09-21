# B2B Feature Migration Notes

Date: 2026-08-25

## Added Mobile Features

| Area | Status |
|---|---|
| Business profile, GSTIN validation, verified status UI | Complete |
| GST certificate PDF/image upload and no-third-party document verification | Complete |
| Address add/edit/delete/set default | Complete |
| Product variants, MOQ, stock validation, tier pricing UI | Complete |
| Dynamic slab pricing in product detail/cart fallback | Complete |
| Distributor bank/UPI payment settings | Complete |
| UPI QR generated automatically from UPI ID | Complete |
| Checkout payment methods: UPI QR, NEFT/RTGS/IMPS, Credit Terms | Complete |
| NEFT bank detail copy and UTR entry | Complete |
| Payment pending verification status model/API submission | Complete |
| Invoice center and GST invoice list/PDF/share actions | Complete |
| Order tracking timeline and shipment status surface | Complete |
| Return and replacement request actions | Complete |
| RFQ request from product detail | Complete |
| RFQ/quotation listing and quote approval action | Complete |
| Credit ledger, due date history, customer statement | Complete |

## Backend Endpoints Expected

The app keeps demo/local fallbacks where these endpoints are not yet deployed.

| Endpoint | Method | Purpose |
|---|---|---|
| `/storefront/customer/business` | GET/PATCH | Business legal name, GSTIN, verification status |
| `/storefront/customer/business/certificate` | POST multipart | GST certificate PDF/image upload and document verification |
| `/storefront/customer/addresses` | POST | Add address |
| `/storefront/customer/addresses/:id` | PATCH/DELETE | Edit/delete address |
| `/storefront/customer/addresses/:id/default` | POST | Set default address |
| `/storefront/payment-settings` | GET | Distributor bank/UPI details |
| `/orders/:id/payments` | POST multipart | UTR/payment proof submission |
| `/invoices` | GET | Invoice center |
| `/orders/:id/timeline` | GET | Tracking timeline |
| `/orders/:id/requests` | POST | Return/replacement request |
| `/rfqs` | GET/POST | RFQ list/create |
| `/quotations` | GET | Quotation list |
| `/quotations/:id/approve` | POST | Quote approval |
| `/storefront/customer/credit-ledger` | GET | Ledger/statement |

## Dependencies

Added `qr_flutter` for production QR generation from UPI URI.
Added `file_picker` for GST certificate PDF/image selection.

Run:

```bash
flutter pub get
```

Run backend migrations after pulling this change:

```bash
cd backend
npm run migration:run
```

## Compatibility Notes

- Existing OTP login, test mobile number, and test OTP were preserved.
- Existing home, categories, products, cart, checkout, orders, reorder, profile, credit, theme, localization, and support flows were extended, not replaced.
- New API fields are optional and older API responses continue to parse.
- Demo fallbacks remain available for local development.
