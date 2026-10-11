import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminScope } from '../../admin/hooks/useScope';
import { getLayout, resetLayout, saveLayout } from '../api/analyticWidgetsApi';
import type { LayoutPage, WidgetLayout } from '../types/analyticWidgets';
import { widgetKeys } from './useWidgetMetrics';

export function useWidgetLayout() {
  const { scopePath, me } = useAdminScope();
  return useQuery({ queryKey: widgetKeys.layout(scopePath), queryFn: () => getLayout(scopePath), enabled: Boolean(me.data) });
}

/** Saves the whole layout; the response (with its new version) replaces the cached layout. */
export function useSaveWidgetLayout() {
  const { scopePath } = useAdminScope(); const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { pages: LayoutPage[]; version: number }) => saveLayout(scopePath, body),
    onSuccess: (layout: WidgetLayout) => client.setQueryData(widgetKeys.layout(scopePath), layout),
  });
}

export function useResetWidgetLayout() {
  const { scopePath } = useAdminScope(); const client = useQueryClient();
  return useMutation({
    mutationFn: () => resetLayout(scopePath),
    onSuccess: (layout: WidgetLayout) => client.setQueryData(widgetKeys.layout(scopePath), layout),
  });
}
