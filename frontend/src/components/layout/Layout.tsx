import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Wifi, WifiOff, RefreshCw, LogOut, Factory, Settings, Users, ShoppingCart, Mail, Wrench, Shield, Terminal, Package, Building2, ChevronDown } from 'lucide-react';
import { PiCow, PiFarm } from 'react-icons/pi';
import { useState, type ComponentType } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus, usePendingSync, useAutoSync } from '@/hooks/useOffline';
import { useAuth } from '@/hooks/useAuth';
import { useFabrica } from '@/hooks/useFabrica';
import { syncAll } from '@/lib/sync';

type IconComponent = ComponentType<any>;

interface NavItem {
  path: string;
  labelKey: string;
  icon: IconComponent;
  exact?: boolean;
}

interface ModuleColors {
  border: string;
  borderActive: string;
  bg: string;
  text: string;
  subtext: string;
  hoverBorder: string;
  hoverBg: string;
  dot: string;
}

interface Module {
  key: string;
  labelKey: string;
  subtitleKey: string;
  icon: IconComponent;
  homeRoute: string;
  navItems: NavItem[];
  requiresModule: string | null;
  adminOnly?: boolean;
  fabricaAdminOnly?: boolean;
  disabled?: boolean;
  colors: ModuleColors;
}

const MODULES: Module[] = [
  {
    key: 'animais',
    labelKey: 'layout.modules.animais.label',
    subtitleKey: 'layout.modules.animais.subtitle',
    icon: PiCow,
    homeRoute: '/',
    requiresModule: 'animais',
    colors: {
      border: 'border-green-200',
      borderActive: 'border-green-600',
      bg: 'bg-green-50',
      text: 'text-green-700',
      subtext: 'text-green-500',
      hoverBorder: 'hover:border-green-400',
      hoverBg: 'hover:bg-green-50',
      dot: 'bg-green-500',
    },
    navItems: [
      { path: '/', labelKey: 'layout.nav.home', icon: LayoutDashboard, exact: true },
      { path: '/fazendas', labelKey: 'layout.nav.farms', icon: PiFarm },
      { path: '/animais', labelKey: 'layout.nav.animals', icon: PiCow },
      { path: '/resumo', labelKey: 'layout.nav.summary', icon: BarChart3 },
    ],
  },
  {
    key: 'fabrica',
    labelKey: 'layout.modules.fabrica.label',
    subtitleKey: 'layout.modules.fabrica.subtitle',
    icon: Factory,
    homeRoute: '/fabrica',
    requiresModule: 'fabrica',
    colors: {
      border: 'border-orange-200',
      borderActive: 'border-orange-600',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      subtext: 'text-orange-500',
      hoverBorder: 'hover:border-orange-400',
      hoverBg: 'hover:bg-orange-50',
      dot: 'bg-orange-500',
    },
    navItems: [
      { path: '/fabrica', labelKey: 'layout.nav.dashboard', icon: LayoutDashboard, exact: true },
      { path: '/fabrica/clientes', labelKey: 'layout.nav.clients', icon: Users },
      { path: '/fabrica/produtos', labelKey: 'layout.nav.products', icon: Package },
      { path: '/fabrica/unidades', labelKey: 'layout.nav.factories', icon: Building2 },
      { path: '/fabrica/pedidos', labelKey: 'layout.nav.orders', icon: ShoppingCart },
      { path: '/fabrica/usuarios', labelKey: 'layout.nav.users', icon: Settings },
      { path: '/fabrica/email', labelKey: 'layout.nav.email', icon: Mail },
      { path: '/fabrica/configuracoes', labelKey: 'layout.nav.config', icon: Wrench },
    ],
  },
  {
    key: 'fabrica-admin',
    labelKey: 'layout.modules.fabricaAdmin.label',
    subtitleKey: 'layout.modules.fabricaAdmin.subtitle',
    icon: Shield,
    homeRoute: '/fabrica',
    requiresModule: 'fabrica',
    fabricaAdminOnly: true,
    colors: {
      border: 'border-amber-200',
      borderActive: 'border-amber-600',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      subtext: 'text-amber-500',
      hoverBorder: 'hover:border-amber-400',
      hoverBg: 'hover:bg-amber-50',
      dot: 'bg-amber-500',
    },
    navItems: [
      { path: '/fabrica', labelKey: 'layout.nav.dashboard', icon: LayoutDashboard, exact: true },
      { path: '/fabrica/clientes', labelKey: 'layout.nav.clients', icon: Users },
      { path: '/fabrica/pedidos', labelKey: 'layout.nav.orders', icon: ShoppingCart },
      { path: '/fabrica/produtos', labelKey: 'layout.nav.products', icon: Package },
      { path: '/fabrica/usuarios', labelKey: 'layout.nav.users', icon: Users },
    ],
  },
  {
    key: 'admin',
    labelKey: 'layout.modules.admin.label',
    subtitleKey: 'layout.modules.admin.subtitle',
    icon: Shield,
    homeRoute: '/admin',
    requiresModule: null,
    adminOnly: true,
    colors: {
      border: 'border-indigo-200',
      borderActive: 'border-indigo-600',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      subtext: 'text-indigo-500',
      hoverBorder: 'hover:border-indigo-400',
      hoverBg: 'hover:bg-indigo-50',
      dot: 'bg-indigo-500',
    },
    navItems: [
      { path: '/admin', labelKey: 'layout.nav.dashboard', icon: LayoutDashboard, exact: true },
      { path: '/admin/usuarios', labelKey: 'layout.nav.users', icon: Users },
      { path: '/admin/query', labelKey: 'layout.nav.sql', icon: Terminal },
    ],
  },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const pending = usePendingSync();
  const queryClient = useQueryClient();
  const { user, logout, hasModule } = useAuth();
  const { fabricas, activeFabrica, setActiveFabricaId, meuPapel } = useFabrica();
  const [isSyncing, setIsSyncing] = useState(false);
  useAutoSync(queryClient);

  const isFabricaOwner = Boolean(user?.is_admin || fabricas.some((f) => f.user_id === user?.id));

  function moduleHasAccess(mod: Module): boolean {
    if (mod.adminOnly) return user?.is_admin ?? false;
    if (mod.key === 'fabrica') return hasModule('fabrica') && isFabricaOwner;
    if (mod.fabricaAdminOnly) return hasModule('fabrica') && !isFabricaOwner;
    return !mod.requiresModule || hasModule(mod.requiresModule) || (user?.is_admin ?? false);
  }

  const activeModule =
    MODULES.find((mod) =>
      moduleHasAccess(mod) &&
      mod.navItems.some((item) => (item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)))
    ) ??
    MODULES.find((mod) => moduleHasAccess(mod)) ??
    MODULES[0];

  const activeNavItems = activeModule.navItems.filter((item) => {
    if (item.path === '/fabrica/unidades') return Boolean(user?.is_admin);
    if (item.path === '/fabrica/usuarios') return meuPapel === 'superusuario' || Boolean(user?.is_admin);
    return true;
  });

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const currentLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'pt-BR';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" data-theme={activeModule.key === 'fabrica-admin' ? 'fabrica' : activeModule.key}>
      <nav className="bg-primary-700 text-white shadow-lg flex-shrink-0">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="text-lg font-bold tracking-wide">
              {t('common.appName')}
            </Link>

            <div className="flex space-x-1">
              {activeNavItems.map(({ path, labelKey, icon: Icon, exact }) => {
                const active = exact ? location.pathname === path : location.pathname.startsWith(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${active ? 'bg-primary-800' : 'hover:bg-primary-600'}`}
                  >
                    <Icon size={16} />
                    {t(labelKey)}
                  </Link>
                );
              })}
            </div>

            {activeModule.key === 'fabrica' && fabricas.length > 0 && user?.is_admin && !location.pathname.startsWith('/fabrica/unidades') && (
              <div className="flex items-center gap-1.5 bg-primary-600 rounded-lg px-2 py-1">
                <Factory size={14} className="text-orange-300 flex-shrink-0" />
                <select
                  value={activeFabrica?.id ?? ''}
                  onChange={(event) => setActiveFabricaId(event.target.value)}
                  className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer appearance-none pr-4"
                  style={{ maxWidth: '160px' }}
                >
                  {fabricas.map((fabrica) => (
                    <option key={fabrica.id} value={fabrica.id} className="text-gray-800 bg-white">
                      {fabrica.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="text-orange-300 -ml-3 flex-shrink-0 pointer-events-none" />
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs">
                <span>{t('common.language.label')}</span>
                <select
                  value={currentLanguage}
                  onChange={(event) => {
                    void i18n.changeLanguage(event.target.value);
                  }}
                  className="bg-primary-600 text-white rounded-md px-2 py-1 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="pt-BR" className="text-gray-800">
                    {t('common.language.ptBR')}
                  </option>
                  <option value="en" className="text-gray-800">
                    {t('common.language.en')}
                  </option>
                </select>
              </label>

              <div className="flex items-center gap-1.5">
                {online ? <Wifi size={15} className="text-green-300" /> : <WifiOff size={15} className="text-red-300" />}
                <span className="text-xs">{online ? t('common.online') : t('common.offline')}</span>
                {pending > 0 && (
                  <button
                    onClick={async () => {
                      setIsSyncing(true);
                      try {
                        await syncAll();
                        queryClient.invalidateQueries({});
                      } finally {
                        setIsSyncing(false);
                      }
                    }}
                    disabled={isSyncing}
                    className="flex items-center gap-1 text-xs bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded-full hover:bg-yellow-400 ml-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    title={t('layout.syncPending')}
                  >
                    <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                    {pending}
                  </button>
                )}
              </div>

              {user && (
                <div className="flex items-center gap-2 pl-3 border-l border-primary-500">
                  <span className="text-sm">{user.nome}</span>
                  <Link
                    to="/configuracao"
                    className="p-1 rounded hover:bg-primary-600 transition-colors"
                    title={t('layout.accountSettings')}
                  >
                    <Settings size={15} />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-1 rounded hover:bg-primary-600 transition-colors"
                    title={t('layout.logout')}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-48 bg-white border-r border-gray-200 flex-shrink-0 py-4 px-3 flex flex-col gap-3">
          {MODULES.map((mod) => {
            const hasAccess = moduleHasAccess(mod);
            const isActive = activeModule.key === mod.key;
            const Icon = mod.icon;

            if (mod.disabled) {
              return (
                <div key={mod.key} className="border-2 border-gray-200 rounded-lg p-3 opacity-50 cursor-not-allowed select-none">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Icon size={16} />
                    <span className="text-sm font-semibold">{t(mod.labelKey)}</span>
                  </div>
                  <span className="text-xs text-gray-400">{t(mod.subtitleKey)}</span>
                  <div className="mt-1 text-xs text-gray-400 italic">{t('common.comingSoon')}</div>
                </div>
              );
            }

            if (!hasAccess) return null;

            const colors = mod.colors;
            return (
              <Link
                key={mod.key}
                to={mod.homeRoute}
                className={`relative block border-2 rounded-lg p-3 transition-colors overflow-hidden ${
                  isActive
                    ? `${colors.borderActive} ${colors.bg}`
                    : `border-gray-200 ${colors.hoverBorder} ${colors.hoverBg}`
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${colors.dot}`} />
                <div className={`flex items-center gap-2 mb-1 pl-1 ${isActive ? colors.text : 'text-gray-700'}`}>
                  <Icon size={16} />
                  <span className="text-sm font-semibold">{t(mod.labelKey)}</span>
                </div>
                <span className={`text-xs pl-1 ${isActive ? colors.subtext : 'text-gray-400'}`}>{t(mod.subtitleKey)}</span>
              </Link>
            );
          })}
        </aside>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
