import { apiClient } from '../../../api/client';
import { omitKeys, toBody } from '../../analytics/lib/filters';
import type { ApiResponse } from '../../../api/types';
import type { LayoutPage, MetricDefinition, WidgetData, WidgetDataRequest, WidgetDataResponse, WidgetLayout } from '../types/analyticWidgets';

async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>): Promise<{ data: T; meta: Record<string, unknown> }> {
  const { data } = await request;
  if (data.status === 'error') throw new Error(data.message);
  return { data: data.data, meta: data.meta as unknown as Record<string, unknown> };
}

export const getMetrics = async (scopePath: string): Promise<MetricDefinition[]> =>
  (await unwrap<{ metrics: MetricDefinition[] }>(apiClient.get(`${scopePath}/analytics/metrics`))).data.metrics;

export const getLayout = async (scopePath: string): Promise<WidgetLayout> =>
  (await unwrap<WidgetLayout>(apiClient.get(`${scopePath}/analytics/widgets`))).data;

/** Replaces the whole layout; the server refuses a stale `version` with 409. */
export const saveLayout = async (scopePath: string, body: { pages: LayoutPage[]; version: number }): Promise<WidgetLayout> =>
  (await unwrap<WidgetLayout>(apiClient.put(`${scopePath}/analytics/widgets`, body))).data;

/** Back to the default layout, which comes back with a new version. */
export const resetLayout = async (scopePath: string): Promise<WidgetLayout> =>
  (await unwrap<WidgetLayout>(apiClient.delete(`${scopePath}/analytics/widgets`))).data;

export async function getData(scopePath: string, request: WidgetDataRequest, signal?: AbortSignal): Promise<WidgetDataResponse> {
  const { filters, ...rest } = request;
  // Here `currency` is the one reporting currency, not the currency filter: the filter never goes in this body.
  const body = { ...toBody(omitKeys(filters, ['currency'])), ...rest };
  const { data, meta } = await unwrap<WidgetData>(apiClient.post(`${scopePath}/analytics/widgets/data`, body, { signal }));
  return { data, timezone: typeof meta.timezone === 'string' ? meta.timezone : null };
}
