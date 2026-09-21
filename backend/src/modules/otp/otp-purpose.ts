/** Stored on `otp_challenges.purpose` — reusable across distributor, storefront, password reset, etc. */
export const OtpPurpose = {
  CUSTOMER_TENANT: 'customer_tenant',
  ACCOUNT_DELETION: 'account_deletion',
  DISTRIBUTOR_PANEL: 'distributor_panel',
} as const;

export type OtpPurposeValue = (typeof OtpPurpose)[keyof typeof OtpPurpose];
