import { Button, Layout, Menu, Typography } from 'antd';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useMe, useSignOut } from '../../features/auth/hooks/useAuth';

export function AdminLayout() {
  const navigate = useNavigate(); const { data: user } = useMe(); const signOut = useSignOut();
  const can = (...permissions: string[]) => permissions.some((permission) => user?.permissions.includes(permission));
  const items = [
    { key: 'home', label: <Link to="/admin">Overview</Link> },
    { key: 'account', label: <Link to="/admin/account">Account security</Link> },
    ...(can('operators.view') ? [{ key: 'operators', label: <Link to="/admin/operators">Operators</Link> }] : []),
    ...(can('provider_instances.view') ? [{ key: 'instances', label: <Link to="/admin/provider-instances">Provider instances</Link> }] : []),
    ...(can('currencies.manage') ? [{ key: 'currencies', label: <Link to="/admin/currencies">Currencies</Link> }] : []),
    ...(can('brands.view', 'brands.manage') ? [{ key: 'brands', label: <Link to="/admin/brands">Brands</Link> }] : []),
    ...(user?.operator_uuid && can('operator.profile.view') ? [{ key: 'operator-profile', label: <Link to="/admin/operator-profile">Operator profile</Link> }] : []),
    ...(can('platform.users.view', 'platform.users.manage', 'users.view', 'users.manage') ? [{ key: 'users', label: <Link to="/admin/users">Users</Link> }] : []),
    ...(can('platform.roles.manage', 'roles.manage') ? [{ key: 'roles', label: <Link to="/admin/roles">Roles</Link> }] : []),
    ...(can('games.catalog.view', 'games.catalog.manage', 'games.view') ? [{ key: 'games', label: <Link to="/admin/games">Games</Link> }] : []),
    ...(can('analytics.all.view', 'analytics.view') ? [{ key: 'analytics', label: <Link to="/admin/analytics">Analytics</Link> }] : []),
    ...(can('audit.all.view', 'audit.view') ? [{ key: 'audit', label: <Link to="/admin/audit">Audit log</Link> }] : []),
  ];
  return <Layout className="app-layout"><Layout.Header className="header"><Typography.Text className="brand">Game Provider Admin</Typography.Text><Button loading={signOut.isPending} onClick={async () => { await signOut.mutateAsync(); navigate('/login'); }}>Sign out</Button></Layout.Header><Layout><Layout.Sider breakpoint="lg" collapsedWidth="0"><Menu theme="dark" mode="inline" items={items} /></Layout.Sider><Layout.Content className="content"><Typography.Paragraph type="secondary">Signed in as {user?.email}</Typography.Paragraph><Outlet /></Layout.Content></Layout></Layout>;
}
