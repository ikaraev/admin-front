import { useMe } from '../../auth/hooks/useAuth';

export function useAdminScope() {
  const me = useMe();
  const operatorUuid = me.data?.operator_uuid;
  return { me, operatorUuid, isPlatform: operatorUuid === null, scopePath: operatorUuid ? `/operators/${operatorUuid}` : '/platform' };
}
