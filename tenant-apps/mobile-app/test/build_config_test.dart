import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/core/config/build_config.dart';

void main() {
  group('BuildConfig launch validation', () {
    test('accepts an HTTPS API with tenant context', () {
      expect(
        BuildConfig.launchConfigurationError(
          apiBaseUrl: 'https://api.example.com/api/v1',
          tenantUuid: 'tenant-id',
          storefrontHost: '',
          allowInsecureHttp: false,
        ),
        isNull,
      );
    });

    test('rejects HTTP unless local testing explicitly enables it', () {
      expect(
        BuildConfig.launchConfigurationError(
          apiBaseUrl: 'http://192.168.0.13:3000/api/v1',
          tenantUuid: 'tenant-id',
          storefrontHost: '',
          allowInsecureHttp: false,
        ),
        contains('HTTPS'),
      );
      expect(
        BuildConfig.launchConfigurationError(
          apiBaseUrl: 'http://192.168.0.13:3000/api/v1',
          tenantUuid: 'tenant-id',
          storefrontHost: '',
          allowInsecureHttp: true,
        ),
        isNull,
      );
    });

    test('requires tenant resolution context', () {
      expect(
        BuildConfig.launchConfigurationError(
          apiBaseUrl: 'https://api.example.com/api/v1',
          tenantUuid: '',
          storefrontHost: '',
          allowInsecureHttp: false,
        ),
        contains('TENANT_ID'),
      );
    });
  });
}
