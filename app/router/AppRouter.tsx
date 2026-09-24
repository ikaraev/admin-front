import { Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { ErrorState, LoadingState } from '../../components/feedback/QueryState';
import { useMe } from '../../features/auth/hooks/useAuth';
import { AccountPage } from '../../features/auth/pages/AccountPage';
import { ForgotPasswordPage, ResetPasswordPage } from '../../features/auth/pages/PasswordPages';
import { InvitationPage } from '../../features/auth/pages/InvitationPage';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { TwoFactorPage } from '../../features/auth/pages/TwoFactorPage';
import { CurrenciesPage, OperatorsPage, ProviderInstancesPage } from '../../features/admin/pages/PlatformPages';
import { BrandsPage, OperatorProfilePage, RolesPage, UsersPage } from '../../features/admin/pages/OperatorPages';
import { AnalyticsPage, AuditPage, GamesPage } from '../../features/admin/pages/ReportingPages';

function ProtectedRoute() { const me = useMe(); if (me.isLoading) return <LoadingState />; if (me.isError || !me.data) return <Navigate to="/login" replace />; return <Outlet />; }
function Overview() { const me = useMe(); return <><h1>Welcome, {me.data?.name}</h1><p>Administration modules will appear here as they are implemented.</p></>; }
function AppError() { return <ErrorState message="The requested page could not be displayed." />; }

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> }, { path: '/two-factor', element: <TwoFactorPage /> }, { path: '/forgot-password', element: <ForgotPasswordPage /> }, { path: '/password-reset', element: <ResetPasswordPage /> }, { path: '/invitation', element: <InvitationPage /> },
  { element: <ProtectedRoute />, children: [{ path: '/admin', element: <AdminLayout />, children: [
    { index: true, element: <Overview /> }, { path: 'account', element: <AccountPage /> },
    { path: 'provider-instances', element: <ProviderInstancesPage /> }, { path: 'currencies', element: <CurrenciesPage /> }, { path: 'operators', element: <OperatorsPage /> },
    { path: 'brands', element: <BrandsPage /> }, { path: 'operator-profile', element: <OperatorProfilePage /> }, { path: 'users', element: <UsersPage /> }, { path: 'roles', element: <RolesPage /> },
    { path: 'games', element: <GamesPage /> }, { path: 'analytics', element: <AnalyticsPage /> }, { path: 'audit', element: <AuditPage /> },
  ] }] },
  { path: '/', element: <Navigate to="/admin" replace /> }, { path: '*', element: <AppError /> },
]);
export function AppRouter() { return <RouterProvider router={router} />; }
