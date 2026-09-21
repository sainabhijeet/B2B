import 'package:b2b_business_mobile_theme/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('demo app opens all bottom navigation tabs', (tester) async {
    await tester.pumpWidget(const B2BBusinessThemeDemo());

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Cart'), findsOneWidget);
    expect(find.text('Order'), findsOneWidget);
    expect(find.text('Credit'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);

    await tester.tap(find.text('Cart'));
    await tester.pumpAndSettle();
    expect(find.text('3 Items'), findsOneWidget);

    await tester.tap(find.text('Order'));
    await tester.pumpAndSettle();
    expect(find.text('Recent Orders'), findsOneWidget);
  });
}
