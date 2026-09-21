import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production', 'staging')
    .default('development'),
  /** When true, 500 JSON includes `debug` / `pgCode` / `pgDetail` even if NODE_ENV=production (local debugging only). */
  HTTP_500_DEBUG: Joi.string().valid('true', 'false').allow('').optional(),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  DB_NAME: Joi.string().required(),
  DB_CONNECT_TIMEOUT_MS: Joi.number().default(10_000),
  DB_POOL_MAX: Joi.number().integer().min(2).max(100).default(20),
  DB_IDLE_TIMEOUT_MS: Joi.number().integer().min(1000).default(30_000),
  DB_STATEMENT_TIMEOUT_MS: Joi.number().integer().min(1000).default(30_000),
  DB_SSL: Joi.string().valid('true', 'false').default('false'),
  DB_SSL_REJECT_UNAUTHORIZED: Joi.string()
    .valid('true', 'false')
    .default('true'),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('60m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  AUTH_COOKIE_SAME_SITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax'),
  AUTH_COOKIE_ACCESS_MAX_AGE_MS: Joi.number()
    .integer()
    .min(60_000)
    .default(3_600_000),
  AUTH_COOKIE_REFRESH_MAX_AGE_MS: Joi.number()
    .integer()
    .min(60_000)
    .default(604_800_000),

  PRIVATE_STORAGE_DIR: Joi.string().allow('').default(''),
  PRIVATE_DOCUMENT_SIGNING_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  PRIVATE_DOCUMENT_URL_TTL_SECONDS: Joi.number()
    .integer()
    .min(30)
    .max(900)
    .default(300),

  BOOTSTRAP_SUPER_ADMIN_EMAIL: Joi.string()
    .email()
    .when('NODE_ENV', {
      is: Joi.valid('test'),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
  BOOTSTRAP_SUPER_ADMIN_PASSWORD: Joi.string()
    .min(8)
    .when('NODE_ENV', {
      is: Joi.valid('test'),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),

  APP_PLATFORM_DOMAIN: Joi.string().default('platform.local'),
  PASSWORD_RESET_LINK_BASE_URL: Joi.string().uri().required(),
  STOREFRONT_DEV_PORT: Joi.number().default(5175),

  /** When not `false`, new tenants get `CREATE SCHEMA` + `_tenant_schema_meta` after insert. */
  TENANT_SCHEMA_AUTO_PROVISION: Joi.string()
    .valid('true', 'false')
    .default('true'),

  /** Deprecated unsafe dev OTP switch. Fixed OTP is disabled in all environments. */
  OTP_FIXED_CODE_ENABLED: Joi.boolean().valid(false).default(false),
  /** Returns the random, single-use OTP to localhost clients for local development only. */
  OTP_DEVELOPMENT_ECHO_ENABLED: Joi.boolean()
    .default(false)
    .when('NODE_ENV', {
      is: Joi.valid('production', 'staging'),
      then: Joi.valid(false),
    }),
  OTP_DEVELOPMENT_FIXED_LOGIN_ENABLED: Joi.boolean()
    .default(false)
    .when('NODE_ENV', {
      is: Joi.valid('production', 'staging'),
      then: Joi.valid(false),
    }),
  OTP_DEVELOPMENT_FIXED_PHONE: Joi.string()
    .pattern(/^\d{10,15}$/)
    .allow('')
    .default(''),
  OTP_DEVELOPMENT_FIXED_CODE: Joi.string()
    .pattern(/^\d{6}$/)
    .allow('')
    .default(''),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  SMTP_FROM_EMAIL: Joi.string().email().required(),
  SMTP_FROM_NAME: Joi.string().default('SaaS Platform'),

  THROTTLE_TTL_MS: Joi.number().default(60_000),
  THROTTLE_LIMIT: Joi.number().default(60),
  AUTH_THROTTLE_TTL_MS: Joi.number().default(60_000),
  AUTH_THROTTLE_LIMIT: Joi.number().integer().min(1).default(5),
  PAYMENT_THROTTLE_TTL_MS: Joi.number().default(60_000),
  PAYMENT_THROTTLE_LIMIT: Joi.number().integer().min(1).default(10),
  CORS_ORIGINS: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SWAGGER_ENABLED: Joi.boolean().when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().valid(false).default(false),
    otherwise: Joi.boolean().default(false),
  }),
  BUILD_MOBILE_API_BASE_URL: Joi.alternatives()
    .try(
      Joi.string().uri({ scheme: ['http', 'https'] }),
      Joi.string().valid(''),
    )
    .default(''),
  BUILD_INFER_LAN_API_BASE_URL: Joi.string()
    .valid('true', 'false')
    .default('false'),
  BUILD_MOBILE_ALLOW_INSECURE_HTTP: Joi.string()
    .valid('true', 'false')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().valid('false'),
    })
    .default('false'),

  /** Phase 0 migration controls; keep all disabled until an approved rollout. */
  THEME_MIGRATION_DIAGNOSTICS_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_MIGRATION_SHADOW_READS: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_MIGRATION_DUAL_WRITE: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_MIGRATION_CANONICAL_RUNTIME: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_MIGRATION_ROLLOUT_PERCENT: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .default(0),

  /** Phase 2 artifact controls; all disabled until an explicit rollout. */
  THEME_ARTIFACT_OBJECT_STORAGE_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_ARTIFACT_DUAL_PUBLISH_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_ARTIFACT_IMPORT_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_ARTIFACT_VERIFICATION_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_ARTIFACT_HEALTH_CHECKS_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),

  /** Phase 3 release validation controls; all disabled until explicitly enabled. */
  THEME_RELEASE_PIPELINE_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_RELEASE_PREVIEW_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_RELEASE_SECURITY_VALIDATION_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_RELEASE_QUARANTINE_DIR: Joi.string().allow('').default(''),
  THEME_RELEASE_MAX_ARCHIVE_BYTES: Joi.number()
    .integer()
    .min(1)
    .default(100 * 1024 * 1024),
  THEME_RELEASE_MAX_UNCOMPRESSED_BYTES: Joi.number()
    .integer()
    .min(1)
    .default(500 * 1024 * 1024),
  THEME_RELEASE_MAX_COMPRESSION_RATIO: Joi.number()
    .integer()
    .min(1)
    .default(100),
  THEME_RELEASE_SUPPORTED_ENGINE_MAJOR: Joi.number()
    .integer()
    .min(1)
    .default(2),
  THEME_RELEASE_LIFECYCLE_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_RELEASE_LIFECYCLE_METRICS_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_DEPLOYMENT_ENGINE_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_DEPLOYMENT_METRICS_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_DEPLOYMENT_LOCK_LEASE_SECONDS: Joi.number()
    .integer()
    .min(30)
    .default(300),
  THEME_RUNTIME_SHADOW_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_LANGUAGE_CONSISTENCY_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_LANGUAGE_CACHE_TTL_MS: Joi.number().integer().min(1000).default(300000),
  THEME_LANGUAGE_PUBLISH_BLOCKING: Joi.string()
    .valid('true', 'false')
    .default('true'),
  THEME_RUNTIME_COMPARISON_STORAGE_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_RUNTIME_METRICS_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_RUNTIME_HEALTH_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  THEME_RUNTIME_SHADOW_SAMPLE_RATE: Joi.number().min(0).max(1).default(1),
  THEME_RUNTIME_SHADOW_MAX_CONCURRENCY: Joi.number()
    .integer()
    .min(1)
    .max(64)
    .default(4),
  THEME_RUNTIME_SHADOW_QUEUE_CAPACITY: Joi.number()
    .integer()
    .min(1)
    .max(100000)
    .default(1000),
  THEME_RUNTIME_SHADOW_TIMEOUT_MS: Joi.number()
    .integer()
    .min(100)
    .max(60000)
    .default(1500),
  THEME_RUNTIME_SHADOW_CIRCUIT_FAILURE_THRESHOLD: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(5),
  THEME_RUNTIME_SHADOW_CIRCUIT_RESET_MS: Joi.number()
    .integer()
    .min(1000)
    .default(30000),
  THEME_RUNTIME_REPORT_MAX_BYTES: Joi.number()
    .integer()
    .min(1024)
    .max(10 * 1024 * 1024)
    .default(256 * 1024),
  THEME_RUNTIME_REPORT_RETENTION_DAYS: Joi.number()
    .integer()
    .min(1)
    .max(3650)
    .default(30),

  /** Optional: directory for uploaded theme `.zip` copies (defaults to repo `../storage` when cwd is `backend/`). */
  THEME_ZIP_ARCHIVE_DIR: Joi.string().allow('').default(''),

  /** Cloudflare (or any CDN) origin for theme/static URLs in API responses; empty = same-origin `/storage/...` paths. */
  PUBLIC_STORAGE_CDN_URL: Joi.alternatives()
    .try(
      Joi.string().uri({ scheme: ['http', 'https'] }),
      Joi.string().valid(''),
    )
    .default(''),

  RAZORPAY_KEY_ID: Joi.string().allow('').default(''),
  RAZORPAY_KEY_SECRET: Joi.string().allow('').default(''),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').default(''),

  APPYFLOW_GST_API_KEY: Joi.string().allow('').default(''),
  APPYFLOW_GST_API_BASE: Joi.string().allow('').default(''),

  OPENAI_API_KEY: Joi.string().allow('').default(''),
  OPENAI_MODEL: Joi.string().allow('').default(''),
  OPENAI_BASE_URL: Joi.string().allow('').default(''),
  TRANSLATION_OPENAI_MODEL: Joi.string().allow('').default(''),
  TRANSLATION_OPENAI_BASE_URL: Joi.string().allow('').default(''),
  TRANSLATION_PIPELINE_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  TRANSLATION_AI_DRAFTS_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  TRANSLATION_REVIEW_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  TRANSLATION_QUEUE_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  TRANSLATION_MAX_ENTRIES_PER_JOB: Joi.number().integer().min(1).default(10000),
  R2_ACCOUNT_ID: Joi.string().allow('').default(''),
  R2_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  R2_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  R2_BUCKET: Joi.string().allow('').default(''),
  R2_PUBLIC_BASE_URL: Joi.string().allow('').default(''),

  WHATSAPP_SHARED_TOKEN: Joi.string().allow('').default(''),
  WHATSAPP_CLOUD_ACCESS_TOKEN: Joi.string().allow('').default(''),
  WHATSAPP_DEBUG_SEND: Joi.string()
    .valid('true', 'false', '1', '0', '')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.valid('false', '0', ''),
    })
    .default(''),
  WHATSAPP_VERIFY_TOKEN: Joi.string().allow('').default(''),
  WHATSAPP_APP_SECRET: Joi.string().allow('').default(''),
  WHATSAPP_API_VERSION: Joi.string().allow('').default('v18.0'),
  WHATSAPP_INVOICE_LINK_BASE_URL: Joi.string().allow('').default(''),
  WHATSAPP_LOG_FULL_PAYLOAD: Joi.string()
    .valid('true', 'false')
    .allow('')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.valid('false', ''),
    })
    .default('false'),
  WHATSAPP_WEBHOOK_SIGNATURE_DEBUG: Joi.string()
    .valid('true', 'false', '1', '0', '')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.valid('false', '0', ''),
    })
    .default(''),
  WHATSAPP_WEBHOOK_ECHO: Joi.string().allow('').default(''),
  WHATSAPP_STOREFRONT_URL: Joi.string().allow('').default(''),
  WHATSAPP_CONVERSATION_WINDOW_HOURS: Joi.number()
    .integer()
    .min(1)
    .max(168)
    .default(24),
  WHATSAPP_LAST_INBOUND_CACHE_TTL_SEC: Joi.number()
    .integer()
    .min(30)
    .max(600)
    .default(120),

  REORDER_DEFAULT_INTERVAL_DAYS: Joi.number().min(1).max(365).default(7),
  REORDER_MAX_LOOKBACK_DAYS: Joi.number().min(7).max(730).default(120),
  REORDER_MAX_ORDERS_SAMPLE: Joi.number().min(5).max(100).default(25),
  REORDER_ANALYTICS_CUSTOMER_LIMIT: Joi.number().min(10).max(2000).default(300),
});
