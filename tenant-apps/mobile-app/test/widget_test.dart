import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/core/config/build_config.dart';

void main() {
  test('tenant define has fallback', () {
    expect(BuildConfig.tenantCode.isNotEmpty, true);
  });
}
