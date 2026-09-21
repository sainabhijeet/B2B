# `hooks/`

Use this folder for **client** hooks only (e.g. `"use client"` cart drawer, auth session, optimistic mutations).

Server-side tenant + theme resolution stays in `lib/resolve-storefront-theme.ts` and `lib/storefrontApi.ts` (SSR).

Suggested next hooks:

- `useStorefrontHost()` — expose current host for client-side API calls (prefer forwarding via a small Route Handler if you need to hide the API origin).
- `useCart()` — wrap `GET/POST /api/v1/cart` once `services/cartService.ts` is wired to the backend.
