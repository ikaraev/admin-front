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
/** `params` go through axios, which writes arrays as `key[]=v`. */
export const read = <T>(path: string, params?: JsonObject) => unwrap<T>(apiClient.get(path, { params }));
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
/**
 * `external_id` is unique within a brand only; `brand_name` is null when the brand was deleted. Profile fields are what the
 * provider stores (`gender` is 'm' | 'f'); `first_*` describe the launch that created the player. Times are ISO UTC.
 */
export interface Player extends JsonObject { uuid: string; operator_uuid: string; brand_uuid: string; brand_name: string | null; external_id: string; country: string | null; nickname: string | null; email: string | null; gender: string | null; city: string | null; first_currency: string | null; first_locale: string | null; first_ip: string | null; first_game: string | null; provider_instance: string; registered_at: string; created_at: string; }
export interface AuditEntry extends JsonObject { uuid: string; occurred_at: string; action: string; entity_type: string | null; entity_id: string | null; actor: { uuid: string; name: string | null } | null; operator_uuid: string | null; }
/** Figures of one currency; amounts are integers in the currency's minor units, percentages are decimal strings. */
export interface CurrencyMetrics extends JsonObject { currency: string; bets_count: number; bets_amount: number; wins_count: number; wins_amount: number; ggr: number; rtp: string | null; hold_percent: string | null; rounds: number; players: number; avg_bet: number | null; arpu: number | null; }
export interface Audience extends JsonObject { players: number; new_players: number; }
export interface AnalyticsSummary extends JsonObject { currencies: CurrencyMetrics[]; previous: CurrencyMetrics[]; audience: Audience; previous_audience: Audience; data_as_of: JsonObject; includes_open_hour: boolean; }

export const adminApi = {
  providerInstances: () => read<ProviderInstance[]>('/platform/provider-instances'),
  currencies: (active?: boolean) => unwrap<Currency[]>(apiClient.get('/currencies', { params: active === undefined ? undefined : { active } })),
};
