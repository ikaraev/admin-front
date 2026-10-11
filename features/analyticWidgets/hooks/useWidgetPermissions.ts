import { useAdminScope } from '../../admin/hooks/useScope';

/** View and manage rights of the current scope. Hiding UI is for usability only: the server enforces both. */
export function useWidgetPermissions() {
  const { me, isPlatform } = useAdminScope();
  const permissions = me.data?.permissions ?? [];
  return {
    canView: permissions.includes(isPlatform ? 'analytics.all.view' : 'analytics.view'),
    canManage: permissions.includes(isPlatform ? 'analytics.all.widgets.manage' : 'analytics.widgets.manage'),
  };
}
