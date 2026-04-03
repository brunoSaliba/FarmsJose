import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, UserCheck, UserX, ShieldCheck, ArrowRight } from 'lucide-react';
import { authApi } from '@/lib/api';

const MODULE_LABELS = {
  animais: 'layout.modules.animais.label',
  fabrica: 'layout.modules.fabrica.label',
} as const;

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => authApi.listUsers(),
  });

  const total = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = total - activeUsers;
  const admins = users.filter((user) => user.is_admin).length;

  const cards = [
    {
      label: t('adminDashboard.cards.totalUsers'),
      value: total,
      icon: Users,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      label: t('adminDashboard.cards.activeUsers'),
      value: activeUsers,
      icon: UserCheck,
      color: 'bg-green-50 text-green-700 border-green-200',
    },
    {
      label: t('adminDashboard.cards.inactiveUsers'),
      value: inactiveUsers,
      icon: UserX,
      color: 'bg-red-50 text-red-700 border-red-200',
    },
    {
      label: t('adminDashboard.cards.admins'),
      value: admins,
      icon: ShieldCheck,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  ];

  const getModuleLabel = (moduleName: string) => {
    const key = MODULE_LABELS[moduleName as keyof typeof MODULE_LABELS];
    return key ? t(key) : moduleName;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{t('adminDashboard.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('adminDashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`flex items-center gap-4 rounded-lg border p-5 ${color}`}>
            <Icon size={28} className="flex-shrink-0 opacity-80" />
            <div>
              <p className="text-3xl font-bold">{isLoading ? '-' : value}</p>
              <p className="mt-0.5 text-xs font-medium opacity-80">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t('adminDashboard.quickActions')}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/usuarios/novo"
            className="flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
          >
            <Users size={15} />
            {t('adminDashboard.newUser')}
          </Link>
          <Link
            to="/admin/usuarios"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t('adminDashboard.manageUsers')}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {!isLoading && users.length > 0 && (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('adminDashboard.recentUsers')}
            </h2>
            <Link to="/admin/usuarios" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
              {t('common.actions.viewAll')} <ArrowRight size={12} />
            </Link>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">{t('common.fields.name')}</th>
                <th className="px-6 py-3 text-left">{t('common.fields.email')}</th>
                <th className="px-6 py-3 text-left">{t('common.fields.modules')}</th>
                <th className="px-6 py-3 text-left">{t('common.fields.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.slice(0, 5).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">
                    {user.nome}
                    {user.is_admin && (
                      <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
                        {t('common.admin')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-500">{user.email}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.modulos.length === 0 ? (
                        <span className="text-xs text-gray-400">{t('adminDashboard.none')}</span>
                      ) : (
                        user.modulos.map((moduleName) => (
                          <span key={moduleName} className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                            {getModuleLabel(moduleName)}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {user.is_active ? t('common.status.active') : t('common.status.inactive')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
