import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiFailure, ApiResponse } from './types';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9501/api/v1';
const csrfCookieName = 'admin_csrf';

export const apiClient = axios.create({ baseURL, withCredentials: true });

function csrfToken(): string | undefined {
  const prefix = `${csrfCookieName}=`;
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

function isMutation(method?: string): boolean {
  return !['get', 'head', 'options'].includes(method?.toLowerCase() ?? 'get');
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (isMutation(config.method)) {
    const token = csrfToken();
    if (token) config.headers.set('X-CSRF-Token', decodeURIComponent(token));
  }
  return config;
});

let refreshInFlight: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = apiClient.post<ApiResponse<{ authenticated: true }>>('/auth/refresh')
      .then(() => undefined)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiFailure>) => {
    const request = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isRefresh = request?.url === '/auth/refresh';

    if (error.response?.status === 401 && request && !request._retried && !isRefresh) {
      request._retried = true;
      try {
        await refreshSession();
        return apiClient(request);
      } catch {
        // The caller receives the original authentication failure and redirects.
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiFailure>(error)) return error.response?.data.message ?? 'The request could not be completed.';
  return 'An unexpected error occurred.';
}
