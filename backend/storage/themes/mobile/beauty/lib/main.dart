import 'package:flutter/material.dart';
import 'l10n/app_strings.dart';
import 'screens/screens.dart';
import 'theme/beauty_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppStrings.instance.load();
  runApp(const BeautyB2BApp());
}

class BeautyB2BApp extends StatelessWidget {
  const BeautyB2BApp({super.key});
  @override
  Widget build(BuildContext c) => AnimatedBuilder(
    animation: AppStrings.instance,
    builder: (_, __) => MaterialApp(
      debugShowCheckedModeBanner: false,
      title: AppStrings.instance.t('brand_name'),
      theme: beautyTheme(),
      locale: AppStrings.instance.locale,
      initialRoute: '/',
      routes: {
        '/': (_) => const SplashScreen(),
        '/onboarding': (_) => const OnboardingScreen(),
        '/login': (_) => const AuthScreen(),
        '/otp': (_) => const AuthScreen(otp: true),
        '/home': (_) => const HomeScreen(),
        '/category': (_) => const CategoryScreen(),
        '/sub-category': (_) => const CategoryScreen(sub: true),
        '/product-list': (_) => const ProductListScreen(),
        '/product': (_) => const ProductDetailScreen(),
        '/brand': (_) => const CampaignScreen(
          titleKey: 'brand_page',
          banner: 'skin-care-sale',
        ),
        '/offers': (_) => const CampaignScreen(
          titleKey: 'offer_page',
          banner: 'flat-40-off',
          navIndex: 2,
        ),
        '/search': (_) => const SearchScreen(),
        '/cart': (_) => const CartScreen(),
        '/checkout': (_) => const CheckoutScreen(),
        '/address': (_) => const CheckoutScreen(step: 'address'),
        '/payment': (_) => const CheckoutScreen(step: 'payment'),
        '/order-success': (_) => const OrderSuccessScreen(),
        '/orders': (_) => const OrdersScreen(),
        '/order-details': (_) => const OrderDetailScreen(),
        '/return': (_) => const ReturnScreen(),
        '/wishlist': (_) => const WishlistScreen(),
        '/notifications': (_) => const NotificationsScreen(),
        '/profile': (_) => const ProfileScreen(),
        '/settings': (_) => const SettingsScreen(),
        '/support': (_) => const SupportScreen(),
      },
    ),
  );
}
