export interface SplitPreset { key: string; label: string; widths: number[] }

export const SPLIT_PRESETS: SplitPreset[] = [
  [12], [6, 6], [8, 4], [4, 8], [4, 4, 4], [3, 3, 3, 3], [6, 3, 3], [3, 3, 6],
].map((widths) => ({ key: widths.join('-'), label: widths.length === 1 ? 'Full' : widths.join(' / '), widths }));

export const FULL_ROW = [12];

export const splitLabel = (widths: number[]) => widths.join(' / ');

export const presetByKey = (key: string) => SPLIT_PRESETS.find((preset) => preset.key === key);
