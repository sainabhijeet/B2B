import { networkInterfaces } from 'node:os';

export interface MobileBuildRuntimeConfig {
  apiBaseUrl: string;
  allowInsecureHttp: boolean;
  developmentLoginPhone: string;
}

function isEnabled(value: string | undefined): boolean {
  return ['true', '1'].includes(value?.trim().toLowerCase() ?? '');
}

export function resolveMobileBuildRuntimeConfig(): MobileBuildRuntimeConfig {
  const explicit =
    process.env.BUILD_MOBILE_API_BASE_URL?.trim() ||
    process.env.MOBILE_API_BASE_URL?.trim();
  const allowInsecureHttp = isEnabled(
    process.env.BUILD_MOBILE_ALLOW_INSECURE_HTTP,
  );
  const configuredDevelopmentPhone =
    process.env.OTP_DEVELOPMENT_FIXED_PHONE?.trim() ?? '';
  const developmentLoginPhone =
    allowInsecureHttp &&
    isEnabled(process.env.OTP_DEVELOPMENT_FIXED_LOGIN_ENABLED) &&
    /^\d{10,15}$/.test(configuredDevelopmentPhone)
      ? configuredDevelopmentPhone
      : '';

  let apiBaseUrl = explicit?.replace(/\/+$/, '') ?? '';
  if (
    !apiBaseUrl &&
    process.env.BUILD_INFER_LAN_API_BASE_URL?.trim() !== 'false'
  ) {
    const port = process.env.PORT?.trim() || '3000';
    for (const entries of Object.values(networkInterfaces())) {
      const entry = (entries ?? []).find(
        (candidate) => candidate.family === 'IPv4' && !candidate.internal,
      );
      if (entry) {
        apiBaseUrl = `http://${entry.address}:${port}/api/v1`;
        break;
      }
    }
  }

  if (!apiBaseUrl) {
    throw new Error(
      'A mobile API URL is required. Configure BUILD_MOBILE_API_BASE_URL with the public HTTPS /api/v1 URL.',
    );
  }

  const parsed = URL.parse(apiBaseUrl);
  const secure = parsed?.protocol === 'https:' && !!parsed.hostname;
  const permittedLocalHttp =
    allowInsecureHttp && parsed?.protocol === 'http:' && !!parsed.hostname;
  if (!secure && !permittedLocalHttp) {
    throw new Error(
      'Mobile release builds require an HTTPS API URL. For local LAN testing only, set BUILD_MOBILE_ALLOW_INSECURE_HTTP=true.',
    );
  }

  return { apiBaseUrl, allowInsecureHttp, developmentLoginPhone };
}

export function mobileBuildNetworkDartDefines(): string[] {
  const config = resolveMobileBuildRuntimeConfig();
  return [
    `API_BASE_URL=${config.apiBaseUrl}`,
    `ALLOW_INSECURE_HTTP=${config.allowInsecureHttp}`,
    `OTP_AUTO_VERIFY_AFTER_REQUEST=${config.allowInsecureHttp}`,
    `OTP_DEVELOPMENT_LOGIN_PHONE=${config.developmentLoginPhone}`,
  ];
}
