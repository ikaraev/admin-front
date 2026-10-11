/**
 * Pure helpers for the analytics filters. None of them knows a filter by name: what exists, its
 * kind and its options all come from `GET analytics/filters`, so the UI follows the server.
 */
import axios from 'axios';
import type { ApiFailure } from '../../../api/types';
import type { AnalyticsFilterCatalog, FilterDefinition, FilterOption, FilterValues } from '../types/filters';

export const NOT_AVAILABLE = 'ANALYTICS_FILTER_NOT_AVAILABLE';

const definitionsByKey = (catalog: AnalyticsFilterCatalog) => new Map(catalog.filters.map((filter) => [filter.key, filter]));

/** True when no filter is set, which means "everything the caller may see". */
export const isEmpty = (values: FilterValues) => Object.keys(values).length === 0;

/**
 * Keeps only what the catalogue offers: known keys, values among the options when there are
 * options, and no empty selections. A URL from another scope loses what this scope can't use.
 */
export function sanitizeFilters(values: FilterValues, catalog: AnalyticsFilterCatalog): FilterValues {
  const definitions = definitionsByKey(catalog);
  const clean: FilterValues = {};
  for (const [key, value] of Object.entries(values)) {
    const filter = definitions.get(key);
    if (!filter) continue;
    const allowed = filter.options ? new Set(filter.options.map((option) => option.value)) : null;
    if (filter.kind === 'multiple') {
      const list = (Array.isArray(value) ? value : [String(value)]).filter((item) => item !== '' && (!allowed || allowed.has(item)));
      if (list.length) clean[key] = [...new Set(list)];
    } else if (filter.kind === 'single') {
      if (typeof value === 'string' && value !== '' && (!allowed || allowed.has(value))) clean[key] = value;
    } else if (value === true) {
      clean[key] = true;
    }
  }
  return clean;
}

/** Every value picked in a multi-select, across all filters: the candidates for a `parent`. */
function pickedValues(values: FilterValues, except: string): Set<string> {
  const picked = new Set<string>();
  for (const [key, value] of Object.entries(values)) if (key !== except && Array.isArray(value)) value.forEach((item) => picked.add(item));
  return picked;
}

/**
 * The options a filter shows. When its options have parents and some of those parents are
 * picked in another filter (brands under the operators picked), only their children are shown.
 */
export function visibleOptions(filter: FilterDefinition, values: FilterValues): FilterOption[] {
  const options = filter.options ?? [];
  if (!options.some((option) => option.parent !== null)) return options;
  const picked = pickedValues(values, filter.key);
  const parents = new Set(options.flatMap((option) => (option.parent !== null && picked.has(option.parent) ? [option.parent] : [])));
  return parents.size ? options.filter((option) => option.parent !== null && parents.has(option.parent)) : options;
}

/** Drops picked values that their narrowed list no longer shows (a brand of an operator just removed). */
export function pruneByParent(values: FilterValues, catalog: AnalyticsFilterCatalog): FilterValues {
  let next = values;
  for (const filter of catalog.filters) {
    const current = next[filter.key];
    if (filter.kind !== 'multiple' || !Array.isArray(current)) continue;
    const shown = new Set(visibleOptions(filter, next).map((option) => option.value));
    const kept = current.filter((value) => shown.has(value));
    if (kept.length === current.length) continue;
    next = { ...next };
    if (kept.length) next[filter.key] = kept; else delete next[filter.key];
  }
  return next;
}

/** Query parameters for axios `params` (arrays become `key[]=v`). Booleans are sent as 1, and only when on. */
export function toQueryParams(values: FilterValues): Record<string, string | string[] | number> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === true ? 1 : value]));
}

/** The JSON body form: the same values, with booleans as `true`. */
export const toBody = (values: FilterValues): Record<string, string | string[] | boolean> => ({ ...values });

/** Reads the filters from URL search params, by the catalogue's keys and kinds. */
export function readFromSearch(params: URLSearchParams, catalog: AnalyticsFilterCatalog): FilterValues {
  const values: FilterValues = {};
  for (const filter of catalog.filters) {
    if (filter.kind === 'multiple') { const list = params.getAll(filter.key); if (list.length) values[filter.key] = list; }
    else if (filter.kind === 'single') { const value = params.get(filter.key); if (value) values[filter.key] = value; }
    else if (params.get(filter.key) === '1') values[filter.key] = true;
  }
  return sanitizeFilters(values, catalog);
}

/** Writes the filters into URL search params, replacing every catalogue key; other params are kept. */
export function writeToSearch(params: URLSearchParams, values: FilterValues, catalog: AnalyticsFilterCatalog): URLSearchParams {
  for (const filter of catalog.filters) params.delete(filter.key);
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else params.set(key, value === true ? '1' : value);
  }
  return params;
}

/** The fields of a `ANALYTICS_FILTER_NOT_AVAILABLE` refusal, or null for any other error. */
export function refusedKeys(error: unknown): string[] | null {
  if (!axios.isAxiosError<ApiFailure>(error) || error.response?.status !== 422 || error.response.data?.error_code !== NOT_AVAILABLE) return null;
  return Object.keys(error.response.data.details ?? {});
}

/** `VALIDATION_FAILED` messages about filter fields, keyed by filter key (`operator.0` counts for `operator`). */
export function filterFieldErrors(error: unknown, catalog: AnalyticsFilterCatalog | undefined): Record<string, string[]> {
  if (!catalog || !axios.isAxiosError<ApiFailure>(error) || error.response?.status !== 422 || error.response.data?.error_code === NOT_AVAILABLE) return {};
  const keys = new Set(catalog.filters.map((filter) => filter.key));
  const found: Record<string, string[]> = {};
  for (const [path, messages] of Object.entries(error.response.data?.details ?? {})) {
    const key = path.split('.')[0];
    if (keys.has(key)) found[key] = [...(found[key] ?? []), ...messages];
  }
  return found;
}

export const omitKeys = (values: FilterValues, keys: string[]): FilterValues => Object.fromEntries(Object.entries(values).filter(([key]) => !keys.includes(key)));
