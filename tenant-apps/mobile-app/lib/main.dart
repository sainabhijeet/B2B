import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/api/api_client.dart';
import 'core/api/auth_token_storage.dart';
import 'core/config/user_app_settings_provider.dart';
import 'core/config/build_config.dart';
import 'core/device/storefront_device.dart';
import 'core/logging/screen_error_provider_observer.dart';
import 'mobile_app_entry.dart';

Future<void> main() async {
  var appStarted = false;
  await runZonedGuarded<Future<void>>(() async {
    try {
      WidgetsFlutterBinding.ensureInitialized();
      BuildConfig.validateForLaunch();
      FlutterError.onError = (FlutterErrorDetails details) {
        FlutterError.presentError(details);
        Zone.current.handleUncaughtError(
          details.exception,
          details.stack ?? StackTrace.current,
        );
      };
      ErrorWidget.builder = (FlutterErrorDetails details) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          home: Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: SelectableText(
                  'App could not render this screen.\n\n${details.exceptionAsString()}',
                ),
              ),
            ),
          ),
        );
      };

      await initializeDateFormatting();
      await SystemChrome.setPreferredOrientations(
        <DeviceOrientation>[
          DeviceOrientation.portraitUp,
          DeviceOrientation.portraitDown,
        ],
      );
      await StorefrontDevice.ensureStorefrontDeviceId();
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt');
      final saved = await const AuthTokenStorage().read();

      runApp(
        ProviderScope(
          observers: <ProviderObserver>[ScreenErrorProviderObserver()],
          overrides: <Override>[
            sharedPreferencesProvider.overrideWithValue(prefs),
            if (saved != null && saved.isNotEmpty)
              authTokenProvider.overrideWith((_) => saved),
          ],
          child: const MobileAppEntry(),
        ),
      );
      appStarted = true;
    } catch (error, stack) {
      debugPrint('Mobile app startup failed: $error\n$stack');
      _showStartupFailure(error);
      appStarted = true;
    }
  }, (Object error, StackTrace stack) {
    debugPrint('Uncaught mobile app error: $error\n$stack');
    if (!appStarted) {
      _showStartupFailure(error);
      appStarted = true;
    }
  });
}

void _showStartupFailure(Object error) {
  runApp(_StartupFailureApp(error: error));
}

class _StartupFailureApp extends StatelessWidget {
  const _StartupFailureApp({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.teal),
      home: Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  const Icon(Icons.error_outline, size: 48),
                  const SizedBox(height: 16),
                  const Text(
                    'App could not start',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  SelectableText(
                    error.toString(),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
