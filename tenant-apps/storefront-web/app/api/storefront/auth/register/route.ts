import { apiBaseUrl } from '@/lib/api-origin';
import { storefrontTenantHeadersFromRequest } from '@/lib/storefront-request-context';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const res = await fetch(`${apiBaseUrl()}/storefront/customer/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...storefrontTenantHeadersFromRequest(req),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
