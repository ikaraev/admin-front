import { BarChart3Icon, Building2Icon, CoinsIcon, Gamepad2Icon, IdCardIcon, LayoutDashboardIcon, ScrollTextIcon, ServerIcon, TagIcon, UserCogIcon, UserRoundIcon, UsersIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { AppSidebar, type NavSection } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useMe, useSignOut } from '@/features/auth/hooks/useAuth';

const ACCOUNT_URL = '/admin/account';

export function AdminLayout() {
  const navigate = useNavigate(); const { pathname } = useLocation(); const { data: user } = useMe(); const signOut = useSignOut();
  const can = (...permissions: string[]) => permissions.some((permission) => user?.permissions.includes(permission));
  const visible = <T,>(entries: [boolean, T][]) => entries.filter(([show]) => show).map(([, item]) => item);
  const sections: NavSection[] = [
    { items: [{ url: '/admin', title: 'Dashboard', icon: LayoutDashboardIcon }] },
    { label: 'Platform', items: visible([
      [can('operators.view'), { url: '/admin/operators', title: 'Operators', icon: Building2Icon }],
      [can('provider_instances.view'), { url: '/admin/provider-instances', title: 'Provider instances', icon: ServerIcon }],
      [can('currencies.manage'), { url: '/admin/currencies', title: 'Currencies', icon: CoinsIcon }],
    ]) },
    { label: 'Management', items: visible([
      [can('brands.view', 'brands.manage'), { url: '/admin/brands', title: 'Brands', icon: TagIcon }],
      // Each scope checks its own permission: platform roles other than Super Admin lack `players.view`.
      [user?.operator_uuid ? can('players.view') : can('operators.view'), { url: '/admin/players', title: 'Players', icon: UserRoundIcon }],
      [Boolean(user?.operator_uuid) && can('operator.profile.view'), { url: '/admin/operator-profile', title: 'Operator profile', icon: IdCardIcon }],
      [can('platform.users.view', 'platform.users.manage', 'users.view', 'users.manage'), { url: '/admin/users', title: 'Users', icon: UsersIcon }],
      [can('platform.roles.manage', 'roles.manage'), { url: '/admin/roles', title: 'Roles', icon: UserCogIcon }],
      [can('games.catalog.view', 'games.catalog.manage', 'games.view'), { url: '/admin/games', title: 'Games', icon: Gamepad2Icon }],
    ]) },
    { label: 'Insights', items: visible([
      [can('analytics.all.view', 'analytics.view'), { url: '/admin/reports', title: 'Reports', icon: BarChart3Icon }],
      [can('audit.all.view', 'audit.view'), { url: '/admin/audit', title: 'Audit log', icon: ScrollTextIcon }],
    ]) },
  ];
  // The most specific item wins when one URL is a prefix of another.
  const activeUrl = sections.flatMap((section) => section.items.map((item) => item.url))
    .filter((url) => (url === '/admin' ? pathname === url : pathname === url || pathname.startsWith(`${url}/`)))
    .reduce<string | undefined>((best, url) => (!best || url.length > best.length ? url : best), undefined);
  const isActive = (url: string) => url === activeUrl;
  const title = pathname.startsWith(ACCOUNT_URL) ? 'Account security' : sections.flatMap((section) => section.items).find((item) => isActive(item.url))?.title ?? 'Dashboard';
  const handleSignOut = async () => { await signOut.mutateAsync(); navigate('/login'); };

  return <SidebarProvider style={{ '--sidebar-width': 'calc(var(--spacing) * 72)', '--header-height': 'calc(var(--spacing) * 12)' } as CSSProperties}>
    <AppSidebar variant="inset" homeUrl="/admin" sections={sections} isActive={isActive} user={{ name: user?.name ?? '', email: user?.email ?? '' }} accountUrl={ACCOUNT_URL} onSignOut={handleSignOut} />
    <SidebarInset className="min-w-0">
      <SiteHeader title={title} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"><Outlet /></div>
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>;
}
