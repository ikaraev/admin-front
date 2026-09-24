import { apiClient } from '../../../api/client';
import type { ApiResponse } from '../../../api/types';
import type { AuthUser, Session, SignInResult, TwoFactorEnrollment } from '../types/auth';

async function data<T>(request: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await request;
  if (response.data.status === 'error') throw new Error(response.data.message);
  return response.data.data;
}

export const signIn = (input: { email: string; password: string }) => data<SignInResult>(apiClient.post('/auth/login', input));
export const verifyTwoFactor = (input: { challenge_token: string; code: string; enrollment?: boolean }) =>
  data<SignInResult>(apiClient.post(input.enrollment ? '/auth/2fa/enroll' : '/auth/2fa/verify', input));
export const getMe = () => data<AuthUser>(apiClient.get('/auth/me'));
export const signOut = () => apiClient.post('/auth/logout').then(() => undefined);
export const requestPasswordReset = (email: string) => apiClient.post('/auth/password/forgot', { email }).then(() => undefined);
export const resetPassword = (token: string, password: string) => apiClient.post('/auth/password/reset', { token, password }).then(() => undefined);
export const acceptInvitation = (token: string, name: string, password: string) => apiClient.post('/auth/invitations/accept', { token, name, password }).then(() => undefined);
export const listSessions = () => data<Session[]>(apiClient.get('/auth/me/sessions'));
export const revokeSession = (uuid: string) => apiClient.delete(`/auth/me/sessions/${uuid}`).then(() => undefined);
export const updateProfile = (input: Pick<AuthUser, 'name' | 'locale' | 'timezone'>) => data<AuthUser>(apiClient.put('/auth/me', input));
export const changePassword = (current_password: string, password: string) => apiClient.put('/auth/me/password', { current_password, password }).then(() => undefined);
export const setupTwoFactor = (current_password: string) => data<TwoFactorEnrollment>(apiClient.post('/auth/me/2fa/setup', { current_password }));
export const enableTwoFactor = (code: string) => data<{ backup_codes: string[] }>(apiClient.post('/auth/me/2fa/enable', { code }));
export const disableTwoFactor = (current_password: string, code: string) => apiClient.post('/auth/me/2fa/disable', { current_password, code }).then(() => undefined);
