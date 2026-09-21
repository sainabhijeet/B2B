# B2B order engine (this repo)

## Data placement

| Area | Schema | Notes |
|------|--------|--------|
| `customers`, `customer_addresses` | `public` | Shared; FK from `users.customer_id`. |
| `customer` credit (`credit_limit`, `credit_balance`) | `public` | `CustomersCreditService` reads/writes here. |
| `invoice_settings` | `public` | Per-tenant numbering / prefix. |
| Catalog, pricing, `inventory`, `cart`, `orders`, `invoices`, … | `t_<uuid32>` | Routed via `TenantSchemaRunner` (`SET search_path`). |

## Order lifecycle (implemented)

1. **Cart** — `CartService` resolves price snapshot; stock check uses `stock_quantity - reserved_stock`.
2. **Checkout** — `OrdersService.createOrder`: credit guard (if `user.customerId`), **reserves** `inventory.reserved_stock`, creates `orders` / `order_items` (with `variant_sku` snapshot), clears cart.
3. **Payment proof** — `order_payments` in tenant schema; order → `PAYMENT_UPLOADED`.
4. **Approve payment** — status `PROCESSING`; **reduces** `credit_balance` for linked customer; generates **invoice** + **invoice_items** from order lines.
5. **Dispatch** — `DISPATCHED` (no stock movement).
6. **Deliver** — `DELIVERED`; decrements `stock_quantity` and `reserved_stock` per line.
7. **Cancel** (`PUT …/status` with `CANCELLED`) — releases reservation; if status was `PENDING` or `PAYMENT_UPLOADED`, reverses checkout credit exposure for linked customer. Blocked if already `DELIVERED` (PROCESSING+ cancel does not auto-adjust credit — extend when you add refunds).

## Migrations (order of execution)

1. `1712600052000-MoveTenantCatalogIntoSchemas` — catalog + pricing into tenant schemas.
2. `1712600053000-TenantCommerceCartOrdersInvoices` — adds `reserved_stock`, `order_items.variant_sku`, table `invoice_items`; copies commerce tables into tenant schemas; repoints FKs to tenant `products` / `variants` / `orders` / `cart`; deletes commerce rows from `public` for those tenants.

Run from `backend/`: `npm run migration:run`.

## NestJS modules (current layout)

- `modules/cart` — storefront cart; uses `TenancyModule`.
- `modules/orders` — create/list/status/payment/dispatch/deliver; uses `TenancyModule` + `InvoicesModule` + `CustomersModule`.
- `modules/invoices` — generate/list/download; `TenancyModule` + `invoice_settings` on default connection.

## Not in scope yet

- Multi-warehouse (`warehouse_id` on `inventory`).
- `payment_proofs` as separate rows from `order_payments` (proof is fields on `order_payments` today).
- PDF invoice binary, Razorpay for **customer** orders (platform billing uses `payments` separately).
- Redis/BullMQ details beyond existing queues.

## Ops

At high tenant count, use **PgBouncer** (or similar) in front of Postgres; `TenantSchemaRunner` uses short-lived `search_path` on pooled connections.
