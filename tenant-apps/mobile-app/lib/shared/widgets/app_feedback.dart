import 'package:flutter/material.dart';

enum AppFeedbackType { success, error, info }

void showAppFeedback(
  BuildContext context, {
  required String message,
  AppFeedbackType type = AppFeedbackType.info,
}) {
  final ColorScheme colors = Theme.of(context).colorScheme;
  final Color background = switch (type) {
    AppFeedbackType.success => colors.primary,
    AppFeedbackType.error => colors.error,
    AppFeedbackType.info => colors.inverseSurface,
  };
  final Color foreground = switch (type) {
    AppFeedbackType.success => colors.onPrimary,
    AppFeedbackType.error => colors.onError,
    AppFeedbackType.info => colors.onInverseSurface,
  };
  final IconData icon = switch (type) {
    AppFeedbackType.success => Icons.check_circle_rounded,
    AppFeedbackType.error => Icons.error_rounded,
    AppFeedbackType.info => Icons.info_rounded,
  };

  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        backgroundColor: background,
        content: Row(
          children: <Widget>[
            Icon(icon, color: foreground, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: foreground,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
}
