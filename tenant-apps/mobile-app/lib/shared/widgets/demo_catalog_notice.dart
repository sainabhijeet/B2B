import 'package:flutter/material.dart';

const String defaultDemoCatalogNotice =
    'Demo catalog preview: Products, prices, stock and offers shown here are sample data for testing only. They are not available for purchase. Real products will appear after the distributor adds the first product.';

class DemoCatalogNoticeFrame extends StatelessWidget {
  const DemoCatalogNoticeFrame({
    super.key,
    required this.enabled,
    required this.child,
    this.message,
  });

  final bool enabled;
  final String? message;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!enabled) return child;
    final colors = Theme.of(context).colorScheme;
    final text = message?.trim().isNotEmpty == true
        ? message!.trim()
        : defaultDemoCatalogNotice;
    return Column(
      children: <Widget>[
        SafeArea(
          bottom: false,
          child: Material(
            color: colors.tertiaryContainer,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: colors.tertiary, width: 1),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Icon(
                    Icons.info_outline,
                    size: 18,
                    color: colors.onTertiaryContainer,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      text,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: colors.onTertiaryContainer,
                            fontWeight: FontWeight.w700,
                            height: 1.35,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}
