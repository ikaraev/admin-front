import { Navigate, Outlet, createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { ErrorState, LoadingState } from '../../components/feedback/QueryState';
import { useMe } from '../../features/auth/hooks/useAuth';
import { ForgotPasswordPage, ResetPasswordPage } from '../../features/auth/pages/PasswordPages';
import { InvitationPage } from '../../features/auth/pages/InvitationPage';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { TwoFactorPage } from '../../features/auth/pages/TwoFactorPage';

// Admin pages are code-split per module so they load only when their route is visited.
const dashboardPage = () => import('../../features/admin/pages/DashboardPage');
const accountPages = () => import('../../features/auth/pages/AccountPage');
const platformPages = () => import('../../features/admin/pages/PlatformPages');
const operatorPages = () => import('../../features/admin/pages/OperatorPages');
const reportingPages = () => import('../../features/admin/pages/ReportingPages');
const playerPages = () => import('../../features/admin/pages/PlayerPages');

function ProtectedRoute() { const me = useMe(); if (me.isLoading) return <div className="flex min-h-svh items-center justify-center"><LoadingState /></div>; if (me.isError || !me.data) return <Navigate to="/login" replace />; return <Outlet />; }
function AppError() { return <main className="mx-auto max-w-xl p-6"><ErrorState message="The requested page could not be displayed." /></main>; }

// Paths of the links the API emails (AccountMailer): the token travels in the hash.
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> }, { path: '/two-factor', element: <TwoFactorPage /> }, { path: '/forgot-password', element: <ForgotPasswordPage /> }, { path: '/reset-password', element: <ResetPasswordPage /> }, { path: '/accept-invitation', element: <InvitationPage /> },
  { element: <ProtectedRoute />, children: [{ path: '/admin', element: <AdminLayout />, children: [
    { index: true, lazy: async () => ({ Component: (await dashboardPage()).DashboardPage }) }, { path: 'account', lazy: async () => ({ Component: (await accountPages()).AccountPage }) },
    { path: 'provider-instances', lazy: async () => ({ Component: (await platformPages()).ProviderInstancesPage }) }, { path: 'currencies', lazy: async () => ({ Component: (await platformPages()).CurrenciesPage }) }, { path: 'operators', lazy: async () => ({ Component: (await platformPages()).OperatorsPage }) },
    { path: 'brands', lazy: async () => ({ Component: (await operatorPages()).BrandsPage }) }, { path: 'operator-profile', lazy: async () => ({ Component: (await operatorPages()).OperatorProfilePage }) }, { path: 'users', lazy: async () => ({ Component: (await operatorPages()).UsersPage }) }, { path: 'roles', lazy: async () => ({ Component: (await operatorPages()).RolesPage }) },
    { path: 'games', lazy: async () => ({ Component: (await reportingPages()).GamesPage }) }, { path: 'reports', lazy: async () => ({ Component: (await reportingPages()).ReportsPage }) }, { path: 'audit', lazy: async () => ({ Component: (await reportingPages()).AuditPage }) },
    { path: 'players', lazy: async () => ({ Component: (await playerPages()).PlayersPage }) }, { path: 'players/:playerUuid', lazy: async () => ({ Component: (await playerPages()).PlayerPage }) },
  ] }] },
  { path: '/', element: <Navigate to="/admin" replace /> }, { path: '*', element: <AppError /> },
]);
export function AppRouter() { return <RouterProvider router={router} />; }
