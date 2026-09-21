import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/features/auth/auth_provider.dart';

void main() {
  group('storefrontDevelopmentOtp', () {
    test('reads the direct local development response', () {
      expect(
        storefrontDevelopmentOtp(<String, dynamic>{
          'expiresInMinutes': 5,
          'developmentCode': '123456',
        }),
        '123456',
      );
    });

    test('supports an enveloped response', () {
      expect(
        storefrontDevelopmentOtp(<String, dynamic>{
          'data': <String, dynamic>{'developmentCode': '654321'},
        }),
        '654321',
      );
    });

    test('does not accept missing or malformed codes', () {
      expect(storefrontDevelopmentOtp(<String, dynamic>{}), isNull);
      expect(
        storefrontDevelopmentOtp(<String, dynamic>{
          'developmentCode': '00000',
        }),
        isNull,
      );
    });
  });
}
