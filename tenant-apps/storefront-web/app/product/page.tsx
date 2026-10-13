import { redirect } from "next/navigation";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function ProductIndexPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const query = new URLSearchParams();
  Object.entries(sp).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value) query.set(key, value);
  });
  redirect(query.size ? `/category?${query.toString()}` : "/category");
}
