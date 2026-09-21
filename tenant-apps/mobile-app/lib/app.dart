import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/api/api_client.dart';
import 'core/config/build_config.dart';
import 'core/config/user_app_settings_provider.dart';
import 'core/localization/language_provider.dart';
import 'core/localization/language_contract.dart';
import 'core/navigation/app_navigation.dart';
import 'core/theme/theme_model.dart';
import 'core/theme/theme_provider.dart';
import 'shared/models/models.dart';
import 'features/auth/auth_screen.dart';
import 'features/categories/category_screen.dart';
import 'features/cart/cart_provider.dart';
import 'features/cart/cart_screen.dart';
import 'features/checkout/checkout_screen.dart';
import 'features/credit/credit_screen.dart';
import 'features/home/home_screen.dart';
import 'features/orders/orders_screen.dart';
import 'features/products/products_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/wishlist/wishlist_screen.dart';

const List<Locale> _fallbackSupportedLocales = <Locale>[Locale('en', 'IN')];

class MobileApp extends ConsumerStatefulWidget {
  const MobileApp({super.key});

  @override
  ConsumerState<MobileApp> createState() => _MobileAppState();
}

class _MobileAppState extends ConsumerState<MobileApp> {
  @override
  Widget build(BuildContext context) {
    final tenant = ref.watch(tenantConfigProvider);
    final String? token = ref.watch(authTokenProvider);
    final bool signedIn = token != null && token.isNotEmpty;
    final selectedTab = ref.watch(selectedTabProvider);
    final int activeTab = selectedTab >= 0 && selectedTab < 5 ? selectedTab : 0;
    final int cartCount = ref.watch(
      cartProvider.select(
        (AsyncValue<List<CartItem>> cart) => cart.maybeWhen(
          data: (List<CartItem> items) => items.fold<int>(
            0,
            (int total, CartItem item) => total + item.quantity,
          ),
          orElse: () => 0,
        ),
      ),
    );
    final bool homeTab = activeTab == 0;
    final bool sectionTab = !homeTab;
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final StorefrontTheme storefrontTheme = ref.watch(themeProvider);
    final LocalizationContract localizationContract =
        ref.watch(localizationContractProvider);
    final UserAppSettings userSettings = ref.watch(userAppSettingsProvider);
    final ColorScheme lightScheme = ColorScheme.fromSeed(
      seedColor: storefrontTheme.branding.seedColor,
    ).copyWith(
      primary: storefrontTheme.branding.seedColor,
      secondary: storefrontTheme.branding.secondarySeedColor,
      surface: storefrontTheme.branding.surfaceSeedColor,
      onSurface: storefrontTheme.branding.textSeedColor,
    );
    final ColorScheme darkScheme = ColorScheme.fromSeed(
      seedColor: storefrontTheme.branding.seedColor,
      brightness: Brightness.dark,
    ).copyWith(
      primary: storefrontTheme.branding.seedColor,
      secondary: storefrontTheme.branding.secondarySeedColor,
    );

    void selectFromBottomBar(int v) {
      ref.read(tabOpenedFromDrawerProvider.notifier).state = false;
      ref.read(selectedTabProvider.notifier).state = v;
    }

    void selectFromDrawer(int v) {
      ref.read(tabOpenedFromDrawerProvider.notifier).state = v != 0;
      ref.read(selectedTabProvider.notifier).state = v;
    }

    void goHome() {
      ref.read(tabOpenedFromDrawerProvider.notifier).state = false;
      ref.read(selectedTabProvider.notifier).state = 0;
    }

    void openCart() {
      ref.read(tabOpenedFromDrawerProvider.notifier).state = false;
      ref.read(selectedTabProvider.notifier).state = 1;
    }

    final List<String> sectionLabels = <String>[
      localization.t('common.home', defaultValue: 'Home'),
      localization.t('common.cart', defaultValue: 'Cart'),
      localization.t('common.order', defaultValue: 'Orders'),
      localization.t('common.categories', defaultValue: 'Categories'),
      localization.t('profile', defaultValue: 'Profile'),
    ];
    final String appBarTitle =
        activeTab == 0 ? tenant.appName : sectionLabels[activeTab];

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: tenant.appName,
      locale: BuildConfig.languageConsistencyEnabled
          ? localizationContract.flutterLocale
          : null,
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      supportedLocales: BuildConfig.languageConsistencyEnabled
          ? localizationContract.supportedLanguages
              .map(Locale.new)
              .toList(growable: false)
          : _fallbackSupportedLocales,
      themeMode: switch (userSettings.themeMode) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      },
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Roboto',
        colorScheme: lightScheme,
        scaffoldBackgroundColor: lightScheme.surface,
        appBarTheme: AppBarTheme(
          toolbarHeight: 60,
          backgroundColor: lightScheme.surface,
          foregroundColor: lightScheme.onSurface,
          surfaceTintColor: lightScheme.surface,
          titleTextStyle: TextStyle(
            color: lightScheme.onSurface,
            fontSize: 18,
            fontWeight: FontWeight.w800,
            fontFamily: 'Roboto',
          ),
        ),
        snackBarTheme: SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          backgroundColor: lightScheme.primary,
          actionTextColor: lightScheme.onPrimary,
          closeIconColor: lightScheme.onPrimary,
          elevation: 8,
          insetPadding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          contentTextStyle: TextStyle(
            color: lightScheme.onPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w700,
            fontFamily: 'Roboto',
          ),
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Roboto',
        colorScheme: darkScheme,
        scaffoldBackgroundColor: darkScheme.surface,
        appBarTheme: AppBarTheme(
          toolbarHeight: 60,
          backgroundColor: darkScheme.surface,
          foregroundColor: darkScheme.onSurface,
          surfaceTintColor: darkScheme.surface,
          titleTextStyle: TextStyle(
            color: darkScheme.onSurface,
            fontSize: 18,
            fontWeight: FontWeight.w800,
            fontFamily: 'Roboto',
          ),
        ),
        snackBarTheme: SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          backgroundColor: darkScheme.primary,
          actionTextColor: darkScheme.onPrimary,
          closeIconColor: darkScheme.onPrimary,
          elevation: 8,
          insetPadding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          contentTextStyle: TextStyle(
            color: darkScheme.onPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w700,
            fontFamily: 'Roboto',
          ),
        ),
      ),
      builder: (BuildContext context, Widget? child) {
        final MediaQueryData media = MediaQuery.of(context);
        return MediaQuery(
          data: media.copyWith(
            textScaler: TextScaler.linear(userSettings.textScale),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
      routes: <String, WidgetBuilder>{
        checkoutRouteName: (_) => const CheckoutScreen(),
      },
      home: Directionality(
        textDirection: BuildConfig.languageConsistencyEnabled
            ? localizationContract.direction
            : TextDirection.ltr,
        child: PopScope(
          canPop: activeTab == 0,
          onPopInvokedWithResult: (bool didPop, Object? result) {
            if (!didPop && activeTab != 0) {
              goHome();
            }
          },
          child: Scaffold(
            extendBody: false,
            appBar: AppBar(
              toolbarHeight: sectionTab ? 60 : null,
              backgroundColor: sectionTab ? lightScheme.primary : null,
              foregroundColor: sectionTab ? lightScheme.onPrimary : null,
              centerTitle: homeTab,
              automaticallyImplyLeading: homeTab,
              leadingWidth: sectionTab ? 64 : null,
              leading: sectionTab
                  ? Padding(
                      padding: const EdgeInsets.only(left: 12),
                      child: IconButton(
                        tooltip: sectionLabels.first,
                        icon: const Icon(Icons.arrow_back_ios_new, size: 18),
                        onPressed: goHome,
                      ),
                    )
                  : null,
              title: Text(
                appBarTitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: sectionTab
                    ? TextStyle(
                        color: lightScheme.onPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      )
                    : null,
              ),
              actions: homeTab
                  ? <Widget>[
                      IconButton(
                        tooltip: sectionLabels[1],
                        icon: _CartIconWithCount(count: cartCount),
                        onPressed: openCart,
                      ),
                      const SizedBox(width: 8),
                    ]
                  : null,
            ),
            drawer: activeTab == 0
                ? _AppDrawer(
                    appName: tenant.appName,
                    selectedIndex: activeTab,
                    signedIn: signedIn,
                    labels: sectionLabels,
                    productsLabel: localization.t(
                      'common.products',
                      defaultValue: 'Products',
                    ),
                    creditLabel: localization.t(
                      'common.credit',
                      defaultValue: 'Credit',
                    ),
                    wishlistLabel: localization.t(
                      'common.wishlist',
                      defaultValue: 'Wishlist',
                    ),
                    accountLabel: localization.t(
                      'common.account',
                      defaultValue: 'Account',
                    ),
                    signedInLabel: localization.t(
                      'common.signedIn',
                      defaultValue: 'Signed in',
                    ),
                    loginLabel: localization.t(
                      'common.login',
                      defaultValue: 'Log in',
                    ),
                    onSelected: selectFromDrawer,
                  )
                : null,
            body: IndexedStack(
              index: activeTab,
              children: const <Widget>[
                HomeScreen(),
                CartScreen(),
                OrdersScreen(),
                CategoryScreen(),
                SettingsScreen(),
              ],
            ),
            bottomNavigationBar: activeTab == 1
                ? null
                : _AppBottomBar(
                    selectedIndex: activeTab,
                    labels: sectionLabels,
                    onSelected: selectFromBottomBar,
                  ),
          ),
        ),
      ),
    );
  }
}

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({
    required this.appName,
    required this.selectedIndex,
    required this.signedIn,
    required this.labels,
    required this.productsLabel,
    required this.creditLabel,
    required this.wishlistLabel,
    required this.accountLabel,
    required this.signedInLabel,
    required this.loginLabel,
    required this.onSelected,
  });

  final String appName;
  final int selectedIndex;
  final bool signedIn;
  final List<String> labels;
  final String productsLabel;
  final String creditLabel;
  final String wishlistLabel;
  final String accountLabel;
  final String signedInLabel;
  final String loginLabel;
  final ValueChanged<int> onSelected;

  static const List<IconData> _sectionIcons = <IconData>[
    Icons.home_outlined,
    Icons.shopping_cart_outlined,
    Icons.receipt_long_outlined,
    Icons.category_outlined,
    Icons.person_outline,
  ];

  void _selectSection(BuildContext context, int index) {
    Navigator.of(context).pop();
    onSelected(index);
  }

  void _openScreen(
    BuildContext context, {
    required String title,
    required Widget screen,
  }) {
    final NavigatorState navigator = Navigator.of(context);
    navigator.pop();
    navigator.push(
      MaterialPageRoute<void>(
        builder: (BuildContext context) => Scaffold(
          appBar: AppBar(
            toolbarHeight: 60,
            backgroundColor: Theme.of(context).colorScheme.primary,
            foregroundColor: Theme.of(context).colorScheme.onPrimary,
            centerTitle: false,
            leadingWidth: 64,
            leading: Padding(
              padding: const EdgeInsets.only(left: 12),
              child: IconButton(
                tooltip: 'Back',
                icon: const Icon(Icons.arrow_back_ios_new, size: 18),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
            title: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          body: screen,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme colorScheme = Theme.of(context).colorScheme;
    return Drawer(
      child: SafeArea(
        child: Column(
          children: <Widget>[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              color: colorScheme.primaryContainer,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: colorScheme.primary,
                    foregroundColor: colorScheme.onPrimary,
                    child: const Icon(Icons.storefront_outlined, size: 28),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    appName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: colorScheme.onPrimaryContainer,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    signedIn ? signedInLabel : loginLabel,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onPrimaryContainer,
                        ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: <Widget>[
                  ListTile(
                    leading: Icon(_sectionIcons.first),
                    title: Text(labels.first),
                    selected: selectedIndex == 0,
                    selectedColor: colorScheme.primary,
                    selectedTileColor:
                        colorScheme.primary.withValues(alpha: 0.10),
                    onTap: () => _selectSection(context, 0),
                  ),
                  ListTile(
                    leading: const Icon(Icons.inventory_2_outlined),
                    title: Text(productsLabel),
                    onTap: () => _openScreen(
                      context,
                      title: productsLabel,
                      screen: const ProductsScreen(),
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Icons.account_balance_wallet_outlined),
                    title: Text(creditLabel),
                    onTap: () => _openScreen(
                      context,
                      title: creditLabel,
                      screen: const CreditScreen(),
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Icons.favorite_border),
                    title: Text(wishlistLabel),
                    onTap: () => _openScreen(
                      context,
                      title: wishlistLabel,
                      screen: const WishlistScreen(),
                    ),
                  ),
                  for (int index = 1; index < labels.length; index++)
                    ListTile(
                      leading: Icon(_sectionIcons[index]),
                      title: Text(labels[index]),
                      selected: selectedIndex == index,
                      selectedColor: colorScheme.primary,
                      selectedTileColor:
                          colorScheme.primary.withValues(alpha: 0.10),
                      onTap: () => _selectSection(context, index),
                    ),
                  const Divider(),
                  ListTile(
                    leading: Icon(
                      signedIn
                          ? Icons.verified_user_outlined
                          : Icons.login_outlined,
                    ),
                    title: Text(accountLabel),
                    subtitle: Text(signedIn ? signedInLabel : loginLabel),
                    onTap: () => _openScreen(
                      context,
                      title: accountLabel,
                      screen: const AuthScreen(),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartIconWithCount extends StatelessWidget {
  const _CartIconWithCount({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const Icon(Icons.shopping_cart_outlined);
    final ColorScheme colorScheme = Theme.of(context).colorScheme;
    return Stack(
      clipBehavior: Clip.none,
      children: <Widget>[
        const Icon(Icons.shopping_cart_outlined),
        Positioned(
          right: -7,
          top: -7,
          child: Container(
            constraints: const BoxConstraints(minWidth: 17, minHeight: 17),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              color: colorScheme.error,
              borderRadius: BorderRadius.circular(9),
              border: Border.all(color: colorScheme.surface, width: 1.5),
            ),
            alignment: Alignment.center,
            child: Text(
              count > 99 ? '99+' : '$count',
              style: TextStyle(
                color: colorScheme.onError,
                fontSize: 9,
                fontWeight: FontWeight.w900,
                height: 1,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AppBottomBar extends StatelessWidget {
  const _AppBottomBar({
    required this.selectedIndex,
    required this.labels,
    required this.onSelected,
  });

  final int selectedIndex;
  final List<String> labels;
  final ValueChanged<int> onSelected;

  static const List<IconData> _icons = <IconData>[
    Icons.home_outlined,
    Icons.grid_view_outlined,
    Icons.shopping_bag_outlined,
    Icons.person_outline,
  ];

  static const List<int> _tabIndexes = <int>[
    0,
    3,
    2,
    4,
  ];

  @override
  Widget build(BuildContext context) {
    final ColorScheme colorScheme = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Container(
        height: 64,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(26),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
          border: Border.all(
            color: colorScheme.outlineVariant.withValues(alpha: 0.45),
          ),
        ),
        child: Row(
          children: List<Widget>.generate(_tabIndexes.length, (int index) {
            final int tabIndex = _tabIndexes[index];
            final bool selected = selectedIndex == tabIndex;
            return Expanded(
              child: InkWell(
                borderRadius: BorderRadius.circular(24),
                onTap: () => onSelected(tabIndex),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 160),
                      width: 26,
                      height: 26,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color:
                            selected ? colorScheme.primary : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: selected
                            ? Border.all(
                                color:
                                    colorScheme.primary.withValues(alpha: 0.24),
                              )
                            : null,
                      ),
                      child: Icon(
                        _icons[index],
                        color: selected
                            ? colorScheme.onPrimary
                            : colorScheme.onSurfaceVariant,
                        size: 20,
                      ),
                    ),
                    const SizedBox(height: 3),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        labels[tabIndex],
                        maxLines: 1,
                        overflow: TextOverflow.clip,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: selected
                              ? colorScheme.onSurface
                              : colorScheme.onSurfaceVariant,
                          fontSize: 10.5,
                          fontWeight:
                              selected ? FontWeight.w800 : FontWeight.w500,
                          height: 1,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
