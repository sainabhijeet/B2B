/** Replace `{{key}}` placeholders; unknown keys left empty. */
export function applyWhatsappTemplate(body: string, vars: Record<string, string>): string {
  let out = body;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v ?? '');
  }
  return out.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '');
}
