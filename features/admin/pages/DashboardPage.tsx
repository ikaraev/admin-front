import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWidgetPermissions } from '../../analyticWidgets/hooks/useWidgetPermissions';
import { AnalyticWidgetsPage } from '../../analyticWidgets/pages/AnalyticWidgetsPage';
import { useAdminScope } from '../hooks/useScope';

/** The admin's own analytic widgets; a welcome card for roles without analytics. */
export function DashboardPage() {
  const { me } = useAdminScope();
  const { canView } = useWidgetPermissions();
  if (!canView) {
    return <Card><CardHeader><CardTitle>Welcome, {me.data?.name}</CardTitle><CardDescription>Use the sidebar to manage the modules available to your role.</CardDescription></CardHeader></Card>;
  }
  return <AnalyticWidgetsPage />;
}
