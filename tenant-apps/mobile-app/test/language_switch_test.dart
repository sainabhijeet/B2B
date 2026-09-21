import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/core/config/storefront_app_config.dart';
import 'package:ridego/core/config/storefront_app_config_provider.dart';
import 'package:ridego/core/config/user_app_settings_provider.dart';
import 'package:ridego/core/localization/language_contract.dart';
import 'package:ridego/core/localization/language_provider.dart';
import 'package:ridego/features/settings/settings_detail_screens.dart';
import 'package:shared_preferences/shared_preferences.dart';

const StorefrontAppConfig _config = StorefrontAppConfig(
  allowGuestAccess: true,
  showPricesToGuest: true,
  allowGuestCart: true,
  enableRepeatOrder: true,
  enableCreditView: true,
  enableNotifications: true,
  defaultHomeLayout: 'grid',
  showBanner: true,
  selectedLanguageCode: 'en',
  languageContract: LocalizationContract(
    languageCode: 'en',
    locale: 'en_IN',
    direction: TextDirection.ltr,
    revision: 1,
    supportedLanguages: <String>['en', 'hi'],
    languageOptions: <LanguageOption>[
      LanguageOption(code: 'en', name: 'English'),
      LanguageOption(code: 'hi', name: 'Hindi'),
    ],
    source: 'test',
  ),
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('language picker opens again after changing locale', (
    WidgetTester tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final SharedPreferences preferences = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          sharedPreferencesProvider.overrideWithValue(preferences),
          storefrontAppConfigProvider.overrideWith((Ref ref) async => _config),
        ],
        child: Consumer(
          builder: (BuildContext context, WidgetRef ref, Widget? child) {
            final LocalizationContract contract = ref.watch(
              localizationContractProvider,
            );
            return MaterialApp(
              locale: contract.flutterLocale,
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              supportedLocales: contract.supportedLanguages
                  .map(Locale.new)
                  .toList(growable: false),
              home: const LanguageRegionScreen(),
            );
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.translate));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Hindi').last);
    await tester.pumpAndSettle();

    final BuildContext screenContext = tester.element(
      find.byType(LanguageRegionScreen),
    );
    expect(
      ProviderScope.containerOf(
        screenContext,
      ).read(userAppSettingsProvider).languageCode,
      'hi',
    );
    expect(find.text('ऐप की भाषा'), findsOneWidget);
    expect(find.text('भाषा और क्षेत्र'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.translate));
    await tester.pumpAndSettle();

    expect(find.byType(BottomSheet), findsOneWidget);
    expect(find.text('English'), findsOneWidget);
  });
}
