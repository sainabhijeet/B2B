export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  meta: Record<string, unknown>;
  message: string;
};

export type AdminLoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: { id: string; role: string; tenantId: string | null };
};
