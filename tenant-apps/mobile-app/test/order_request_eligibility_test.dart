import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/features/orders/orders_provider.dart';

void main() {
  test('replacement is available only for delivered orders', () {
    expect(canRequestOrderReplacement('DELIVERED'), isTrue);
    expect(canRequestOrderReplacement('PROCESSING'), isFalse);
    expect(canRequestOrderReplacement('DISPATCHED'), isFalse);
  });

  test('cancellation is available only before shipment', () {
    for (final status in <String>['PENDING', 'CONFIRMED', 'PROCESSING']) {
      expect(canCancelOrder(status), isTrue, reason: status);
    }
    for (final status in <String>[
      'DISPATCHED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ]) {
      expect(canCancelOrder(status), isFalse, reason: status);
    }
  });
}
