import { redirect } from "next/navigation";

type Search = Promise<{ previewLanguage?: string | string[] }>;

export default async function PreviewPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const language = Array.isArray(params.previewLanguage) ? params.previewLanguage[0] : params.previewLanguage;
  redirect(`/?previewMode=1${language ? `&previewLanguage=${encodeURIComponent(language)}` : ""}`);
}
