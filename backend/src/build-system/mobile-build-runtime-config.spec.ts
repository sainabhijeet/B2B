import {
  mobileBuildNetworkDartDefines,
  resolveMobileBuildRuntimeConfig,
} from './mobile-build-runtime-config';

describe('mobile build runtime config', () => {
  const original = {
    apiBaseUrl: process.env.BUILD_MOBILE_API_BASE_URL,
    legacyApiBaseUrl: process.env.MOBILE_API_BASE_URL,
    inferLan: process.env.BUILD_INFER_LAN_API_BASE_URL,
    allowInsecure: process.env.BUILD_MOBILE_ALLOW_INSECURE_HTTP,
    fixedLoginEnabled: process.env.OTP_DEVELOPMENT_FIXED_LOGIN_ENABLED,
    fixedPhone: process.env.OTP_DEVELOPMENT_FIXED_PHONE,
  };

  afterEach(() => {
    restore('BUILD_MOBILE_API_BASE_URL', original.apiBaseUrl);
    restore('MOBILE_API_BASE_URL', original.legacyApiBaseUrl);
    restore('BUILD_INFER_LAN_API_BASE_URL', original.inferLan);
    restore('BUILD_MOBILE_ALLOW_INSECURE_HTTP', original.allowInsecure);
    restore('OTP_DEVELOPMENT_FIXED_LOGIN_ENABLED', original.fixedLoginEnabled);
    restore('OTP_DEVELOPMENT_FIXED_PHONE', original.fixedPhone);
  });

  it('accepts a public HTTPS API URL by default', () => {
    process.env.BUILD_MOBILE_API_BASE_URL = 'https://api.example.com/api/v1/';
    process.env.BUILD_INFER_LAN_API_BASE_URL = 'false';
    process.env.BUILD_MOBILE_ALLOW_INSECURE_HTTP = 'false';
    process.env.OTP_DEVELOPMENT_FIXED_LOGIN_ENABLED = 'false';
    process.env.OTP_DEVELOPMENT_FIXED_PHONE = '';

    expect(resolveMobileBuildRuntimeConfig()).toEqual({
      apiBaseUrl: 'https://api.example.com/api/v1',
      allowInsecureHttp: false,
      developmentLoginPhone: '',
    });
    expect(mobileBuildNetworkDartDefines()).toEqual([
      'API_BASE_URL=https://api.example.com/api/v1',
      'ALLOW_INSECURE_HTTP=false',
      'OTP_AUTO_VERIFY_AFTER_REQUEST=false',
      'OTP_DEVELOPMENT_LOGIN_PHONE=',
    ]);
  });

  it('rejects HTTP when local testing was not explicitly enabled', () => {
    process.env.BUILD_MOBILE_API_BASE_URL = 'http://192.168.0.13:3000/api/v1';
    process.env.BUILD_INFER_LAN_API_BASE_URL = 'false';
    process.env.BUILD_MOBILE_ALLOW_INSECURE_HTTP = 'false';

    expect(() => resolveMobileBuildRuntimeConfig()).toThrow(
      'require an HTTPS API URL',
    );
  });

  it('allows HTTP only for explicitly enabled LAN testing builds', () => {
    process.env.BUILD_MOBILE_API_BASE_URL = 'http://192.168.0.13:3000/api/v1';
    process.env.BUILD_INFER_LAN_API_BASE_URL = 'false';
    process.env.BUILD_MOBILE_ALLOW_INSECURE_HTTP = 'true';
    process.env.OTP_DEVELOPMENT_FIXED_LOGIN_ENABLED = 'true';
    process.env.OTP_DEVELOPMENT_FIXED_PHONE = '9999999999';

    expect(resolveMobileBuildRuntimeConfig()).toEqual({
      apiBaseUrl: 'http://192.168.0.13:3000/api/v1',
      allowInsecureHttp: true,
      developmentLoginPhone: '9999999999',
    });
    expect(mobileBuildNetworkDartDefines()).toContain(
      'OTP_AUTO_VERIFY_AFTER_REQUEST=true',
    );
    expect(mobileBuildNetworkDartDefines()).toContain(
      'OTP_DEVELOPMENT_LOGIN_PHONE=9999999999',
    );
  });
});

function restore(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
