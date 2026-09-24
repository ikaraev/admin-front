import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptInvitation, changePassword, disableTwoFactor, enableTwoFactor, getMe, listSessions, requestPasswordReset, resetPassword, revokeSession, setupTwoFactor, signIn, signOut, updateProfile, verifyTwoFactor } from '../api/authApi';

export const authKeys = { me: ['auth', 'me'] as const, sessions: ['auth', 'sessions'] as const };
export const useMe = () => useQuery({ queryKey: authKeys.me, queryFn: getMe, retry: false, staleTime: 60_000 });
export const useSessions = () => useQuery({ queryKey: authKeys.sessions, queryFn: listSessions });

export function useSignOut() {
  const client = useQueryClient();
  return useMutation({ mutationFn: signOut, onSuccess: () => client.clear() });
}

export function useAccountMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: authKeys.me });
  return {
    signIn: useMutation({ mutationFn: signIn, onSuccess: invalidate }),
    verifyTwoFactor: useMutation({ mutationFn: verifyTwoFactor, onSuccess: invalidate }),
    forgotPassword: useMutation({ mutationFn: requestPasswordReset }),
    resetPassword: useMutation({ mutationFn: ({ token, password }: { token: string; password: string }) => resetPassword(token, password) }),
    acceptInvitation: useMutation({ mutationFn: ({ token, name, password }: { token: string; name: string; password: string }) => acceptInvitation(token, name, password) }),
    updateProfile: useMutation({ mutationFn: updateProfile, onSuccess: invalidate }),
    changePassword: useMutation({ mutationFn: ({ currentPassword, password }: { currentPassword: string; password: string }) => changePassword(currentPassword, password) }),
    setupTwoFactor: useMutation({ mutationFn: setupTwoFactor }),
    enableTwoFactor: useMutation({ mutationFn: enableTwoFactor, onSuccess: invalidate }),
    disableTwoFactor: useMutation({ mutationFn: ({ currentPassword, code }: { currentPassword: string; code: string }) => disableTwoFactor(currentPassword, code), onSuccess: invalidate }),
    revokeSession: useMutation({ mutationFn: revokeSession, onSuccess: () => client.invalidateQueries({ queryKey: authKeys.sessions }) }),
  };
}
