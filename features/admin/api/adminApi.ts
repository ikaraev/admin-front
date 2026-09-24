import { apiClient } from '../../../api/client';
import type { ApiResponse } from '../../../api/types';

export type JsonObject = Record<string, unknown>;
export interface Page<T> { items: T[]; page: number; perPage: number; total: number; totalPages: number; }

async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await request;
  if (data.status === 'error') throw new Error(data.message);
  return data.data;
}

async function unwrapPage<T>(request: Promise<{ data: ApiResponse<T[]> }>): Promise<Page<T>> {
  const { data } = await request;
  if (data.status === 'error') throw new Error(data.message);
  return { items: data.data, page: data.meta.page ?? 1, perPage: data.meta.per_page ?? 25, total: data.meta.total ?? 0, totalPages: data.meta.total_pages ?? 0 };
}

export const list = <T extends JsonObject>(path: string, params?: JsonObject) => unwrapPage<T>(apiClient.get(path, { params }));
export const read = <T>(path: string) => unwrap<T>(apiClient.get(path));
export const create = <T extends JsonObject>(path: string, body: JsonObject) => unwrap<T>(apiClient.post(path, body));
export const update = <T extends JsonObject>(path: string, body: JsonObject) => unwrap<T>(apiClient.put(path, body));
export const action = <T extends JsonObject>(path: string, body: JsonObject = {}) => unwrap<T>(apiClient.post(path, body));
export const remove = (path: string) => apiClient.delete(path).then(() => undefined);

export interface ProviderInstance extends JsonObject { uuid: string; code: string; name: string; type: string; status: string; jurisdiction: string | null; operators_count: number; }
export interface Currency extends JsonObject { code: string; name: string; symbol: string | null; units: number; is_crypto: boolean; is_active: boolean; version: number; operators_count: number; }
export interface Operator extends JsonObject { uuid: string; name: string; legal_name: string | null; server_id: string; status: string; is_test: boolean; wallet_url: string | null; wallet_timeout_ms: number; wallet_connect_timeout_ms: number; lobby_url: string | null; deposit_url: string | null; default_locale: string; demo_enabled: boolean; require_2fa: boolean; reporting_currency: string; currencies: string[]; timezone: string; version: number; provider_instance: { uuid: string; code: string }; brands_count: number; }
export interface Credential extends JsonObject { uuid: string; purpose: string; key_id: string; secret_last4: string; status: string; grace_until: string | null; last_used_at: string | null; }
export interface Brand extends JsonObject { uuid: string; operator_uuid: string; external_id: string; name: string; status: string; currencies: string[] | null; domains: string[]; version: number; }
export interface Role extends JsonObject { uuid: string; name: string; description: string | null; scope: string; is_system: boolean; permissions: string[]; users_count: number; version: number; }
export interface Permission extends JsonObject { slug: string; scope: string; group: string; description: string; }
export interface ManagedUser extends JsonObject { uuid: string; email: string; name: string; status: string; roles: Array<{ uuid: string; name: string; is_system: boolean }>; brand_uuids: string[] | null; two_factor_enabled: boolean; last_login_at: string | null; version: number; }
export interface Game extends JsonObject { uuid: string; identifier: string; title: string; category: string; genre: string; status: string; currencies: JsonObject[]; bet_levels: JsonObject[]; win_thresholds: JsonObject[]; version: number; }
export interface AuditEntry extends JsonObject { uuid: string; occurred_at: string; action: string; entity_type: string | null; entity_id: string | null; actor: { uuid: string; name: string | null } | null; operator_uuid: string | null; }
export interface AnalyticsSummary extends JsonObject { currencies: JsonObject[]; previous: JsonObject[]; audience: JsonObject; previous_audience: JsonObject; data_as_of: JsonObject; includes_open_hour: boolean; }
export interface TimeseriesPoint extends JsonObject { bucket: string; currencies: JsonObject[]; }

export const adminApi = {
  providerInstances: () => read<ProviderInstance[]>('/platform/provider-instances'),
  currencies: (active?: boolean) => unwrap<Currency[]>(apiClient.get('/currencies', { params: active === undefined ? undefined : { active } })),
};
