/**
 * Legacy script name kept for npm hooks. Themes are JSON + assets only;
 * runtime loads `GET /themes/storefront/current` + `/storage/.../theme.json` or `public/themes/{key}/`.
 */
console.log("[themes:sync] no-op — registry-only storefront; update public/themes/ or upload ZIP via admin.");
process.exit(0);
