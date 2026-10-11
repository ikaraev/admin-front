import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { adminApi, type Currency } from '../api/adminApi';

/** Currencies by code, for formatting amounts in their minor units. */
export function useCurrencyIndex() {
  const currencies = useQuery({ queryKey: ['currencies'], queryFn: () => adminApi.currencies() });
  return useMemo(() => new Map((currencies.data ?? []).map((currency): [string, Currency] => [currency.code, currency])), [currencies.data]);
}
