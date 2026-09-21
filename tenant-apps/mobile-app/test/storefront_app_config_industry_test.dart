import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/core/config/storefront_app_config.dart';
import 'package:ridego/core/config/storefront_app_config_provider.dart';
import 'package:ridego/core/localization/language_contract.dart';
import 'package:ridego/features/settings/settings_detail_screens.dart';

const LocalizationContract _languageContract = LocalizationContract(
  languageCode: 'en',
  locale: 'en_IN',
  direction: TextDirection.ltr,
  revision: 1,
  supportedLanguages: <String>['en'],
  languageOptions: <LanguageOption>[
    LanguageOption(code: 'en', name: 'English'),
  ],
  source: 'test',
);

void main() {
  test('parses the industry selected during distributor registration', () {
    final StorefrontAppConfig config = StorefrontAppConfig.fromJson(
      <String, dynamic>{
        'allowGuestAccess': false,
        'showPricesToGuest': false,
        'allowGuestCart': false,
        'enableRepeatOrder': true,
        'enableCreditView': true,
        'enableNotifications': true,
        'defaultHomeLayout': 'grid',
        'showBanner': true,
        'selectedLanguageCode': 'en',
        'industryId': '10000000-0000-4000-8000-000000000021',
        'industryName': 'Food Processing & Packaging Machinery',
      },
    );

    expect(
      config.industryId,
      '10000000-0000-4000-8000-000000000021',
    );
    expect(config.industryLabel, 'Food Processing & Packaging Machinery');
  });

  testWidgets('shows live B2B industry and only enabled capabilities', (
    WidgetTester tester,
  ) async {
    const StorefrontAppConfig config = StorefrontAppConfig(
      allowGuestAccess: false,
      showPricesToGuest: false,
      allowGuestCart: false,
      enableRepeatOrder: true,
      enableCreditView: false,
      enableNotifications: true,
      defaultHomeLayout: 'grid',
      showBanner: true,
      selectedLanguageCode: 'en',
      languageContract: _languageContract,
      industryId: 'industry-id',
      industryName: 'Machinery',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          storefrontAppConfigProvider.overrideWith((Ref ref) async => config),
        ],
        child: const MaterialApp(home: BusinessIndustryScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Machinery'), findsOneWidget);
    expect(find.text('B2B wholesale & distribution'), findsOneWidget);
    expect(find.text('Repeat ordering'), findsOneWidget);
    expect(find.text('Order and account notifications'), findsOneWidget);
    expect(find.text('Trade credit visibility'), findsNothing);
    expect(find.text('Guest cart'), findsNothing);
  });
}
