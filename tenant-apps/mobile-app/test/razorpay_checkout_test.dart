import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/features/payments/razorpay_order_checkout.dart';

void main() {
  test('formats the profile mobile for Razorpay contact prefill', () {
    expect(razorpayContactFromProfile('9999999999'), '+919999999999');
    expect(razorpayContactFromProfile('+91 99999 99999'), '+919999999999');
    expect(razorpayContactFromProfile('91-9999999999'), '+919999999999');
  });

  test('does not create a contact value for an empty profile mobile', () {
    expect(razorpayContactFromProfile('  '), isEmpty);
  });
}
