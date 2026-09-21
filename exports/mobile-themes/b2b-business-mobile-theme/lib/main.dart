import 'package:flutter/material.dart';

import 'screens/app_shell.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const B2BBusinessThemeDemo());
}

class B2BBusinessThemeDemo extends StatelessWidget {
  const B2BBusinessThemeDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'B2B Business Theme',
      theme: AppTheme.light(),
      home: const AppShell(),
    );
  }
}
