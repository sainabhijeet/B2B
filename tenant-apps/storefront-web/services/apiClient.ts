import { apiBaseUrl } from "@/lib/api-origin";

const base = () => apiBaseUrl();

export type ApiClientOptions = RequestInit & {
  /** Forward cookies for same-site SSR calls when you add auth. */
  accessToken?: string | null;
};

export async function apiClient<T>(path: string, init: ApiClientOptions = {}): Promise<T> {
  const { accessToken, headers, ...rest } = init;
  const url = path.startsWith("http") ? path : `${base()}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}
