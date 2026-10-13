import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:ridego/features/products/recently_viewed_provider.dart';
import 'package:ridego/shared/models/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('records recently viewed products latest-first without duplicates',
      () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final container = ProviderContainer();
    addTearDown(container.dispose);

    const first = Product(
      id: 'p-1',
      name: 'First product',
      categoryId: 'skin-care',
    );
    const second = Product(
      id: 'p-2',
      name: 'Second product',
      categoryId: 'hair-care',
    );

    final controller = container.read(recentlyViewedProductsProvider.notifier);
    controller.record(first);
    controller.record(second);
    controller.record(first);

    expect(
      container
          .read(recentlyViewedProductsProvider)
          .map((product) => product.id),
      <String>['p-1', 'p-2'],
    );

    await Future<void>.delayed(const Duration(milliseconds: 20));
    final prefs = await SharedPreferences.getInstance();
    expect(
      prefs.getKeys().any((key) => key.startsWith('recently_viewed_products')),
      isTrue,
    );
  });
}
