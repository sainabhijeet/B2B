import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/api/api_client.dart';
import 'core/config/storefront_app_config.dart';
import 'core/config/build_config.dart';
import 'core/config/storefront_app_config_provider.dart';
import 'core/theme/theme_model.dart';
import 'core/theme/theme_provider.dart';
import 'core/theme/app_typography.dart';
import 'core/localization/language_contract.dart';
import 'core/localization/language_provider.dart';
import 'core/localization/preview_language_synchronizer.dart';
import 'features/auth/auth_screen.dart';
import 'shared/widgets/demo_catalog_notice.dart';

const List<Locale> _fallbackSupportedLocales = <Locale>[Locale('en', 'IN')];

/// Loads [storefrontAppConfigProvider] first, then either login-only or full [MobileApp].
class MobileAppEntry extends ConsumerStatefulWidget {
  const MobileAppEntry({super.key});

  @override
  ConsumerState<MobileAppEntry> createState() => _MobileAppEntryState();
}

class _MobileAppEntryState extends ConsumerState<MobileAppEntry>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    ref.invalidate(storefrontAppConfigProvider);
    unawaited(ref.read(themeProvider.notifier).refreshFromStorefront());
  }

  @override
  Widget build(BuildContext context) {
    final cfgAsync = ref.watch(storefrontAppConfigProvider);
    cfgAsync.whenData((_) {
      ref.read(themeProvider.notifier).scheduleHydrateFromStorefront();
    });

    final tenant = ref.watch(tenantConfigProvider);
    final StorefrontTheme storefrontTheme = ref.watch(themeProvider);
    final ColorScheme loginScheme = ColorScheme.fromSeed(
      seedColor: storefrontTheme.branding.seedColor,
    ).copyWith(
      primary: storefrontTheme.branding.seedColor,
      secondary: storefrontTheme.branding.secondarySeedColor,
      surface: storefrontTheme.branding.surfaceSeedColor,
      onSurface: storefrontTheme.branding.textSeedColor,
    );
    final theme = ThemeData(
      useMaterial3: true,
      fontFamily: appFontFamily,
      colorScheme: loginScheme,
      scaffoldBackgroundColor: loginScheme.surface,
      appBarTheme: AppBarTheme(
        toolbarHeight: 60,
        backgroundColor: loginScheme.surface,
        foregroundColor: loginScheme.onSurface,
        surfaceTintColor: loginScheme.surface,
        titleTextStyle: TextStyle(
          color: loginScheme.onSurface,
          fontSize: 18,
          fontWeight: FontWeight.w800,
          fontFamily: appFontFamily,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: loginScheme.primary,
        actionTextColor: loginScheme.onPrimary,
        closeIconColor: loginScheme.onPrimary,
        elevation: 8,
        insetPadding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        contentTextStyle: TextStyle(
          color: loginScheme.onPrimary,
          fontSize: 14,
          fontWeight: FontWeight.w700,
          fontFamily: appFontFamily,
        ),
      ),
    );

    return cfgAsync.when(
      loading: () => MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: theme,
        home: const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      ),
      error: (Object e, StackTrace _) => MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: theme,
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Could not load app settings',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SelectableText(
                    'Backend: ${tenant.apiBaseUrl}\n\n$e',
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () =>
                        ref.invalidate(storefrontAppConfigProvider),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      data: (StorefrontAppConfig c) {
        final LocalizationContract localizationContract =
            ref.watch(localizationContractProvider);
        final String? token = ref.watch(authTokenProvider);
        final bool authed = token != null && token.isNotEmpty;
        if (!c.allowGuestAccess && !authed) {
          return PreviewLanguageSynchronizer(
            child: MaterialApp(
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
              theme: theme,
              builder: (BuildContext context, Widget? child) =>
                  DemoCatalogNoticeFrame(
                enabled: c.isDemoCatalog,
                message: c.catalogNotice,
                child: child ?? const SizedBox.shrink(),
              ),
              home: Directionality(
                textDirection: BuildConfig.languageConsistencyEnabled
                    ? localizationContract.direction
                    : TextDirection.ltr,
                child: Scaffold(
                  appBar: AppBar(title: Text(tenant.appName)),
                  body: const AuthScreen(),
                ),
              ),
            ),
          );
        }
        return const PreviewLanguageSynchronizer(child: MobileApp());
      },
    );
  }
}
