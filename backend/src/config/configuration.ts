export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME,
    connectTimeoutMs: parseInt(
      process.env.DB_CONNECT_TIMEOUT_MS ?? '10000',
      10,
    ),
    poolMax: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? '30000', 10),
    statementTimeoutMs: parseInt(
      process.env.DB_STATEMENT_TIMEOUT_MS ?? '30000',
      10,
    ),
    ssl: process.env.DB_SSL === 'true',
    sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '60m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  documents: {
    privateStorageDir: process.env.PRIVATE_STORAGE_DIR?.trim() || undefined,
    signingSecret:
      process.env.PRIVATE_DOCUMENT_SIGNING_SECRET ||
      process.env.JWT_ACCESS_SECRET,
    signedUrlTtlSeconds: parseInt(
      process.env.PRIVATE_DOCUMENT_URL_TTL_SECONDS ?? '300',
      10,
    ),
  },
  bootstrap: {
    superAdminEmail: process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL,
    superAdminPassword: process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD,
  },
  app: {
    platformDomain: process.env.APP_PLATFORM_DOMAIN ?? 'platform.local',
    passwordResetLinkBaseUrl: process.env.PASSWORD_RESET_LINK_BASE_URL ?? '',
  },
  storefront: {
    devPort: parseInt(process.env.STOREFRONT_DEV_PORT ?? '5175', 10),
  },
  /** Per-tenant Postgres schema provisioning (`CREATE SCHEMA`, bootstrap meta table). */
  tenantSchema: {
    autoProvision:
      (process.env.TENANT_SCHEMA_AUTO_PROVISION ?? 'true').toLowerCase() !==
      'false',
  },
  otp: {
    fixedCodeEnabled: false,
    developmentEchoEnabled:
      process.env.NODE_ENV === 'development' &&
      process.env.OTP_DEVELOPMENT_ECHO_ENABLED === 'true',
    developmentFixedLoginEnabled:
      process.env.NODE_ENV === 'development' &&
      process.env.OTP_DEVELOPMENT_ECHO_ENABLED === 'true' &&
      process.env.OTP_DEVELOPMENT_FIXED_LOGIN_ENABLED === 'true',
    developmentFixedPhone:
      process.env.OTP_DEVELOPMENT_FIXED_PHONE?.trim() ?? '',
    developmentFixedCode: process.env.OTP_DEVELOPMENT_FIXED_CODE?.trim() ?? '',
  },
  throttle: {
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
    authTtlMs: parseInt(process.env.AUTH_THROTTLE_TTL_MS ?? '60000', 10),
    authLimit: parseInt(process.env.AUTH_THROTTLE_LIMIT ?? '5', 10),
    paymentTtlMs: parseInt(process.env.PAYMENT_THROTTLE_TTL_MS ?? '60000', 10),
    paymentLimit: parseInt(process.env.PAYMENT_THROTTLE_LIMIT ?? '10', 10),
  },
  swagger: {
    enabled:
      process.env.NODE_ENV !== 'production' &&
      process.env.SWAGGER_ENABLED === 'true',
  },
  /**
   * Phase 0 migration controls. All flags are off by default so the legacy
   * theme runtime remains authoritative until a later phase explicitly opts
   * into a capability.
   */
  themeMigration: {
    diagnosticsEnabled:
      process.env.THEME_MIGRATION_DIAGNOSTICS_ENABLED === 'true',
    shadowReadsEnabled: process.env.THEME_MIGRATION_SHADOW_READS === 'true',
    dualWriteEnabled: process.env.THEME_MIGRATION_DUAL_WRITE === 'true',
    canonicalRuntimeEnabled:
      process.env.THEME_MIGRATION_CANONICAL_RUNTIME === 'true',
    rolloutPercent: parseInt(
      process.env.THEME_MIGRATION_ROLLOUT_PERCENT ?? '0',
      10,
    ),
  },
  themeArtifacts: {
    objectStorageEnabled:
      process.env.THEME_ARTIFACT_OBJECT_STORAGE_ENABLED === 'true',
    dualPublishEnabled:
      process.env.THEME_ARTIFACT_DUAL_PUBLISH_ENABLED === 'true',
    importEnabled: process.env.THEME_ARTIFACT_IMPORT_ENABLED === 'true',
    verificationEnabled:
      process.env.THEME_ARTIFACT_VERIFICATION_ENABLED === 'true',
    healthChecksEnabled:
      process.env.THEME_ARTIFACT_HEALTH_CHECKS_ENABLED === 'true',
  },
  themeReleasePipeline: {
    enabled: process.env.THEME_RELEASE_PIPELINE_ENABLED === 'true',
    previewEnabled: process.env.THEME_RELEASE_PREVIEW_ENABLED === 'true',
    securityValidationEnabled:
      process.env.THEME_RELEASE_SECURITY_VALIDATION_ENABLED === 'true',
    quarantineDir: process.env.THEME_RELEASE_QUARANTINE_DIR ?? '',
    maxArchiveBytes: parseInt(
      process.env.THEME_RELEASE_MAX_ARCHIVE_BYTES ?? String(100 * 1024 * 1024),
      10,
    ),
    maxUncompressedBytes: parseInt(
      process.env.THEME_RELEASE_MAX_UNCOMPRESSED_BYTES ??
        String(500 * 1024 * 1024),
      10,
    ),
    maxCompressionRatio: parseInt(
      process.env.THEME_RELEASE_MAX_COMPRESSION_RATIO ?? '100',
      10,
    ),
    supportedEngineMajor: parseInt(
      process.env.THEME_RELEASE_SUPPORTED_ENGINE_MAJOR ?? '2',
      10,
    ),
  },
  themeReleaseLifecycle: {
    enabled: process.env.THEME_RELEASE_LIFECYCLE_ENABLED === 'true',
    metricsEnabled:
      process.env.THEME_RELEASE_LIFECYCLE_METRICS_ENABLED === 'true',
  },
  themeDeploymentEngine: {
    enabled: process.env.THEME_DEPLOYMENT_ENGINE_ENABLED === 'true',
    metricsEnabled: process.env.THEME_DEPLOYMENT_METRICS_ENABLED === 'true',
    lockLeaseSeconds: parseInt(
      process.env.THEME_DEPLOYMENT_LOCK_LEASE_SECONDS ?? '300',
      10,
    ),
  },
  themeRuntimeShadow: {
    enabled: process.env.THEME_RUNTIME_SHADOW_ENABLED === 'true',
    comparisonStorageEnabled:
      process.env.THEME_RUNTIME_COMPARISON_STORAGE_ENABLED === 'true',
    metricsEnabled: process.env.THEME_RUNTIME_METRICS_ENABLED === 'true',
    healthEnabled: process.env.THEME_RUNTIME_HEALTH_ENABLED === 'true',
    sampleRate: parseFloat(process.env.THEME_RUNTIME_SHADOW_SAMPLE_RATE ?? '1'),
    maxConcurrency: parseInt(
      process.env.THEME_RUNTIME_SHADOW_MAX_CONCURRENCY ?? '4',
      10,
    ),
    queueCapacity: parseInt(
      process.env.THEME_RUNTIME_SHADOW_QUEUE_CAPACITY ?? '1000',
      10,
    ),
    timeoutMs: parseInt(
      process.env.THEME_RUNTIME_SHADOW_TIMEOUT_MS ?? '1500',
      10,
    ),
    circuitFailureThreshold: parseInt(
      process.env.THEME_RUNTIME_SHADOW_CIRCUIT_FAILURE_THRESHOLD ?? '5',
      10,
    ),
    circuitResetMs: parseInt(
      process.env.THEME_RUNTIME_SHADOW_CIRCUIT_RESET_MS ?? '30000',
      10,
    ),
    reportMaxBytes: parseInt(
      process.env.THEME_RUNTIME_REPORT_MAX_BYTES ?? String(256 * 1024),
      10,
    ),
    reportRetentionDays: parseInt(
      process.env.THEME_RUNTIME_REPORT_RETENTION_DAYS ?? '30',
      10,
    ),
  },
  translationPipeline: {
    enabled: process.env.TRANSLATION_PIPELINE_ENABLED === 'true',
    aiDraftsEnabled: process.env.TRANSLATION_AI_DRAFTS_ENABLED === 'true',
    reviewEnabled: process.env.TRANSLATION_REVIEW_ENABLED === 'true',
    queueEnabled: process.env.TRANSLATION_QUEUE_ENABLED === 'true',
    maxEntriesPerJob: parseInt(
      process.env.TRANSLATION_MAX_ENTRIES_PER_JOB ?? '10000',
      10,
    ),
  },
  themeLanguageConsistency: {
    enabled: process.env.THEME_LANGUAGE_CONSISTENCY_ENABLED === 'true',
    cacheTtlMs: parseInt(
      process.env.THEME_LANGUAGE_CACHE_TTL_MS ?? '300000',
      10,
    ),
    publishBlocking: process.env.THEME_LANGUAGE_PUBLISH_BLOCKING !== 'false',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  /**
   * Optional public CDN origin for `/storage/...` URLs returned in JSON (themes, manifests).
   * Typical: Cloudflare orange-cloud hostname or R2/custom domain. No trailing slash.
   * Example: https://cdn.yourplatform.com
   */
  assets: {
    publicStorageCdnUrl:
      process.env.PUBLIC_STORAGE_CDN_URL?.replace(/\/$/, '') ?? '',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    fromEmail: process.env.SMTP_FROM_EMAIL ?? '',
    fromName: process.env.SMTP_FROM_NAME ?? 'SaaS Platform',
  },
  /** Shared Razorpay credentials for SaaS billing and storefront order checkout. */
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },
  /** AppyFlow GST lookup (https://api.appyflow.in/api/verifyGST). */
  appyflow: {
    gstApiKey: process.env.APPYFLOW_GST_API_KEY ?? '',
    /** Official docs: `https://appyflow.in/api/verifyGST?gstNo=…&key_secret=…` */
    gstApiBase: process.env.APPYFLOW_GST_API_BASE ?? 'https://appyflow.in/api',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model:
      process.env.OPENAI_MODEL ||
      process.env.TRANSLATION_OPENAI_MODEL ||
      'gpt-4o-mini',
    baseUrl:
      process.env.OPENAI_BASE_URL ||
      process.env.TRANSLATION_OPENAI_BASE_URL ||
      'https://api.openai.com/v1',
  },
  /** Cloudflare R2 (S3-compatible). Optional — without it, AI logos return as data URLs. */
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    /** Public base URL for objects (e.g. https://pub-xxxxx.r2.dev or custom domain). */
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? '',
  },
  /**
   * Smart reorder: interval from order history (median gap) or cold-start default;
   * distributor analytics scans up to `analyticsCustomerLimit` customers per request.
   */
  reorder: {
    defaultIntervalDays: parseInt(
      process.env.REORDER_DEFAULT_INTERVAL_DAYS ?? '7',
      10,
    ),
    maxLookbackDays: parseInt(
      process.env.REORDER_MAX_LOOKBACK_DAYS ?? '120',
      10,
    ),
    maxOrdersSample: parseInt(
      process.env.REORDER_MAX_ORDERS_SAMPLE ?? '25',
      10,
    ),
    analyticsCustomerLimit: parseInt(
      process.env.REORDER_ANALYTICS_CUSTOMER_LIMIT ?? '300',
      10,
    ),
  },
  /** Meta WhatsApp Cloud API (webhook + outbound text). */
  whatsapp: {
    /** Platform default Graph token when a line does not use its own (`use_own_token` + `access_token`). */
    sharedAccessToken: (() => {
      const a = (process.env.WHATSAPP_SHARED_TOKEN ?? '').trim();
      const b = (process.env.WHATSAPP_CLOUD_ACCESS_TOKEN ?? '').trim();
      /** Use `||` not `??`: an empty `WHATSAPP_SHARED_TOKEN=` line must fall through to legacy cloud token. */
      return a || b;
    })(),
    /** @deprecated Prefer `WHATSAPP_SHARED_TOKEN`; kept for backward compatibility (also used as fallback above). */
    cloudAccessToken: process.env.WHATSAPP_CLOUD_ACCESS_TOKEN ?? '',
    /** Log tenant / phone_number_id / use_own_token / token preview on each send (dev only). */
    debugSendLog:
      process.env.WHATSAPP_DEBUG_SEND === '1' ||
      (process.env.WHATSAPP_DEBUG_SEND ?? '').toLowerCase() === 'true',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? '',
    appSecret: process.env.WHATSAPP_APP_SECRET ?? '',
    apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v19.0',
    /** Optional: appended as `{{invoiceLink}}` = `${base}/${encodeURIComponent(invoiceNumber)}` for INVOICE replies. */
    invoiceLinkBaseUrl:
      process.env.WHATSAPP_INVOICE_LINK_BASE_URL?.replace(/\/$/, '') ?? '',
    /** Log full JSON body on each POST (set WHATSAPP_LOG_FULL_PAYLOAD=false to disable in prod). */
    logFullPayload:
      (process.env.WHATSAPP_LOG_FULL_PAYLOAD ?? 'false').toLowerCase() !==
      'false',
    /** When true: on failed `X-Hub-Signature-256`, log raw body length, encoding, secret length (not value). */
    webhookSignatureDebug:
      process.env.WHATSAPP_WEBHOOK_SIGNATURE_DEBUG === '1' ||
      (process.env.WHATSAPP_WEBHOOK_SIGNATURE_DEBUG ?? '').toLowerCase() ===
        'true',
    /** If true: echo `You said: …` and skip tenant/customer/intent (debug only). */
    webhookEcho:
      process.env.WHATSAPP_WEBHOOK_ECHO === '1' ||
      (process.env.WHATSAPP_WEBHOOK_ECHO ?? '').toLowerCase() === 'true',
    /** Shown after beta repeat-confirm (optional). */
    storefrontUrlHint: process.env.WHATSAPP_STOREFRONT_URL?.trim() ?? '',
    /** Last inbound → “active session” length for hybrid custom vs Meta template (hours). */
    conversationWindowHours: parseInt(
      process.env.WHATSAPP_CONVERSATION_WINDOW_HOURS ?? '24',
      10,
    ),
    /** Redis TTL for cached last-inbound timestamp (`wa:last_inbound:*`). */
    lastInboundCacheTtlSec: parseInt(
      process.env.WHATSAPP_LAST_INBOUND_CACHE_TTL_SEC ?? '120',
      10,
    ),
  },
});
