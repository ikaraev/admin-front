import type { Currency } from '../api/adminApi';

/** Formats an integer amount in minor units, e.g. 125000 USD (2 units) → "$1,250.00". */
export function formatMinor(amount: number, code: string, currency?: Pick<Currency, 'units' | 'symbol'>) {
  const units = currency?.units ?? 2;
  const value = new Intl.NumberFormat(undefined, { minimumFractionDigits: Math.min(units, 2), maximumFractionDigits: units }).format(amount / 10 ** units);
  return currency?.symbol ? `${currency.symbol}${value}` : `${value} ${code}`;
}

export const formatCount = (value: number) => new Intl.NumberFormat().format(value);

export const formatPercent = (value: string | null) => (value === null ? '—' : `${Number(value).toFixed(2)}%`);
