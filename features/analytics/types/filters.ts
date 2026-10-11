export type FilterKind = 'multiple' | 'single' | 'boolean';
export interface FilterOption { value: string; label: string; parent: string | null }
/** `options: null` means "not a short list" (games, currencies), never "no values". */
export interface FilterDefinition { key: string; label: string; kind: FilterKind; options: FilterOption[] | null }
export interface Dimension { key: string; label: string }
/** What the caller may narrow and group analytics by, as `GET analytics/filters` answers it. */
export interface AnalyticsFilterCatalog { filters: FilterDefinition[]; dimensions: Dimension[] }

/** Values keyed by filter key: string[] for multiple, string for single, true for boolean. */
export type FilterValues = Record<string, string[] | string | true>;
