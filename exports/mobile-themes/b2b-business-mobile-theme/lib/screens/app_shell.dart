import 'package:flutter/material.dart';

import '../mock_data/mock_data.dart';
import '../widgets/navigation/app_bottom_navigation.dart';
import 'cart/cart_screen.dart';
import 'credit/credit_screen.dart';
import 'home/home_screen.dart';
import 'login/login_screen.dart';
import 'orders/orders_screen.dart';
import 'settings/settings_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const <Widget>[
          HomeScreen(),
          CartScreen(),
          OrdersScreen(),
          CreditScreen(),
          SettingsScreen(),
          LoginScreen(),
        ],
      ),
      bottomNavigationBar: AppBottomNavigation(
        index: _index,
        cartCount: MockData.cart.length,
        onSelected: (value) => setState(() => _index = value),
      ),
    );
  }
}
