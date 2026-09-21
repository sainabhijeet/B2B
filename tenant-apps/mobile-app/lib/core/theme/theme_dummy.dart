/// Fallback JSON when `/storefront/theme` is unavailable; first paint before cache/API (Step 4).
///
/// Change `base_layout` to `list` or `fast_order` to switch [HomeScreen] layouts locally.
final Map<String, dynamic> kThemeDummyJson = <String, dynamic>{
  'base_layout': 'grid',
  'config': <String, dynamic>{
    'card_style': 'rounded',
    'spacing': 'compact',
    'show_banner': true,
    'enable_quick_qty': false,
    'compact': false,
  },
  'branding': <String, dynamic>{
    'primary_color': '#1565C0',
    'logo': '',
    'secondary_color': '#26A69A',
  },
};
