export interface AuthUser {
  uuid: string;
  operator_uuid: string | null;
  email: string;
  name: string;
  locale: string;
  timezone: string;
  two_factor_enabled: boolean;
  permissions: string[];
  brand_uuids: string[] | null;
}

export interface Session {
  uuid: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  current: boolean;
}

export interface TwoFactorEnrollment {
  secret: string;
  provisioning_uri: string;
}

export type SignInResult =
  | { authenticated: true; user: AuthUser; backup_codes?: string[] }
  | { authenticated: false; challenge_token: string; challenge: 'two_factor' | 'two_factor_enrollment'; enrollment?: TwoFactorEnrollment };
