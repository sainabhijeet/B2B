import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:ridego/core/config/storefront_app_config.dart';
import 'package:ridego/core/config/storefront_app_config_provider.dart';
import 'package:ridego/core/config/user_app_settings_provider.dart';
import 'package:ridego/core/localization/language_contract.dart';
import 'package:ridego/core/localization/language_provider.dart';
import 'package:ridego/core/localization/mobile_localization_service.dart';
import 'package:ridego/features/products/product_detail_screen.dart';
import 'package:ridego/features/products/recently_viewed_provider.dart';
import 'package:ridego/shared/models/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('records the product after the first frame without a build error',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final SharedPreferences preferences = await SharedPreferences.getInstance();

    const Product product = Product(
      id: 'product-1',
      name: 'Test product',
      categoryId: 'category-1',
      price: 125,
      imageUrl: 'https://example.com/tall-product.png',
    );
    const LocalizationContract languageContract = LocalizationContract(
      languageCode: 'en',
      locale: 'en_IN',
      direction: TextDirection.ltr,
      revision: 0,
      supportedLanguages: <String>['en'],
      source: 'test',
    );
    const StorefrontAppConfig appConfig = StorefrontAppConfig(
      allowGuestAccess: true,
      showPricesToGuest: true,
      allowGuestCart: false,
      enableRepeatOrder: true,
      enableCreditView: true,
      enableNotifications: true,
      defaultHomeLayout: 'grid',
      showBanner: true,
      selectedLanguageCode: 'en',
      languageContract: languageContract,
    );
    const MobileLocalizationService localization = MobileLocalizationService(
      contract: languageContract,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          sharedPreferencesProvider.overrideWithValue(preferences),
          storefrontAppConfigProvider
              .overrideWith((Ref ref) async => appConfig),
          mobileLocalizationServiceProvider.overrideWithValue(localization),
        ],
        child: const MaterialApp(
          home: ProductDetailScreen(product: product),
        ),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
    final Image productImage = tester.widget<Image>(find.byType(Image));
    expect(productImage.fit, BoxFit.contain);
    final ProviderContainer container = ProviderScope.containerOf(
      tester.element(find.byType(ProductDetailScreen)),
    );
    expect(
      container
          .read(recentlyViewedProductsProvider)
          .map((Product row) => row.id),
      <String>['product-1'],
    );
  });
}
