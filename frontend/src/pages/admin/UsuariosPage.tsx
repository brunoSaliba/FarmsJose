import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, ShieldCheck, Users, KeyRound, Factory, X, Save } from 'lucide-react';
import { PiCow } from 'react-icons/pi';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import type { TFunction } from 'i18next';
import type { UserInfo } from '@/types';

const MODULES = [
  {
    value: 'animais',
    labelKey: 'adminUsers.modules.animais.label',
    subtitleKey: 'adminUsers.modules.animais.subtitle',
    icon: PiCow,
    colors: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    badgeColors: 'bg-emerald-100 text-emerald-700',
  },
  {
    value: 'fabrica',
    labelKey: 'adminUsers.modules.fabrica.label',
    subtitleKey: 'adminUsers.modules.fabrica.subtitle',
    icon: Factory,
    colors: 'bg-orange-50 border-orange-300 text-orange-800',
    badgeColors: 'bg-orange-100 text-orange-700',
  },
] as const;

function getModuleDefinition(moduleName: string) {
  return MODULES.find((moduleItem) => moduleItem.value === moduleName);
}

function ModuloBadge({ modulo, t }: { modulo: string; t: TFunction }) {
  const definition = getModuleDefinition(modulo);

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
        definition?.badgeColors ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {definition ? t(definition.labelKey) : modulo}
    </span>
  );
}

function PermissoesModal({
  user,
  onClose,
}: {
  user: UserInfo;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modulos, setModulos] = useState<string[]>(user.modulos);

  const mutation = useMutation({
    mutationFn: (mods: string[]) => authApi.updateUser(user.id, { modulos: mods }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
  });

  function toggle(value: string) {
    setModulos((previous) =>
      previous.includes(value) ? previous.filter((moduleItem) => moduleItem !== value) : [...previous, value]
    );
  }

  const changed =
    JSON.stringify([...modulos].sort()) !== JSON.stringify([...user.modulos].sort());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <KeyRound size={16} className="text-primary-600" />
              {t('adminUsers.permissions.title')}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {user.nome} · {user.email}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          {user.is_admin && (
            <div className="flex items-start gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-700">
              <ShieldCheck size={14} className="mt-0.5 flex-shrink-0" />
              <span>{t('adminUsers.permissions.adminHint')}</span>
            </div>
          )}

          {MODULES.map(({ value, labelKey, subtitleKey, icon: Icon, colors }) => {
            const active = modulos.includes(value);

            return (
              <button
                key={value}
                type="button"
                onClick={() => !user.is_admin && toggle(value)}
                disabled={user.is_admin}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  active ? colors : 'border-gray-200 bg-gray-50 text-gray-500'
                } ${user.is_admin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-90'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2 ${active ? 'bg-white/60' : 'bg-white'}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{t(labelKey)}</p>
                    <p className="mt-0.5 text-xs opacity-70">{t(subtitleKey)}</p>
                  </div>
                  <div
                    className={`flex h-5 w-10 items-center rounded-full px-0.5 transition-colors ${
                      active ? 'bg-current' : 'bg-gray-300'
                    }`}
                    style={{ opacity: active ? 0.7 : 1 }}
                  >
                    <div
                      className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          {mutation.isError && (
            <p className="text-xs text-red-600">
              {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                t('adminUsers.permissions.saveError')}
            </p>
          )}

          <div className="ml-auto flex gap-3">
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common.actions.cancel')}
            </button>
            <button
              onClick={() => mutation.mutate(modulos)}
              disabled={mutation.isPending || !changed || user.is_admin}
              className="flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-800 disabled:opacity-50"
            >
              <Save size={14} />
              {mutation.isPending ? t('common.loading') : t('common.actions.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  user,
  onConfirm,
  onCancel,
  loading,
}: {
  user: UserInfo;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold text-gray-800">{t('adminUsers.deleteTitle')}</h3>
        <p className="mb-6 text-sm text-gray-600">
          {t('adminUsers.deleteMessage', { name: user.nome, email: user.email })}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {t('common.actions.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? t('adminUsers.deleting') : t('common.actions.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<UserInfo | null>(null);
  const [toEditPerms, setToEditPerms] = useState<UserInfo | null>(null);
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => authApi.listUsers(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setToDelete(null);
    },
  });

  const filtered = users.filter((user) => {
    const normalizedSearch = search.toLowerCase();
    const matchesSearch =
      search === '' ||
      user.nome.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      filterAtivo === 'todos' || (filterAtivo === 'ativo' ? user.is_active : !user.is_active);

    return matchesSearch && matchesStatus;
  });

  const total = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Users size={22} />
            {t('adminUsers.title')}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t('adminUsers.summary', { total, active: activeUsers })}
          </p>
        </div>

        <Link
          to="/admin/usuarios/novo"
          className="flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          <Plus size={16} />
          {t('adminDashboard.newUser')}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-4 py-3 shadow">
        <input
          type="text"
          placeholder={t('adminUsers.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-48 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={filterAtivo}
          onChange={(event) => setFilterAtivo(event.target.value as typeof filterAtivo)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="todos">{t('adminUsers.filters.all')}</option>
          <option value="ativo">{t('adminUsers.filters.activeOnly')}</option>
          <option value="inativo">{t('adminUsers.filters.inactiveOnly')}</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">{t('adminUsers.empty')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">{t('common.fields.name')}</th>
                <th className="px-6 py-3 text-left">{t('common.fields.email')}</th>
                <th className="px-6 py-3 text-left">
                  {t('common.fields.modules')} / {t('common.fields.access')}
                </th>
                <th className="px-6 py-3 text-left">{t('common.fields.status')}</th>
                <th className="px-6 py-3 text-left">{t('common.fields.createdAt')}</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <span className="font-medium text-gray-800">{user.nome}</span>
                    {user.is_admin && (
                      <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
                        <ShieldCheck size={10} /> {t('common.admin')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-500">{user.email}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {user.is_admin ? (
                        <span className="text-xs font-medium italic text-purple-600">{t('adminUsers.fullAccess')}</span>
                      ) : user.modulos.length === 0 ? (
                        <span className="text-xs text-gray-400">{t('adminUsers.noAccess')}</span>
                      ) : (
                        user.modulos.map((moduleName) => <ModuloBadge key={moduleName} modulo={moduleName} t={t} />)
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
                  <td className="px-6 py-3 text-xs text-gray-400">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setToEditPerms(user)}
                        className="rounded p-1.5 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        title={t('adminUsers.managePermissions')}
                      >
                        <KeyRound size={15} />
                      </button>
                      <Link
                        to={`/admin/usuarios/${user.id}/editar`}
                        className="rounded p-1.5 text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
                        title={t('common.actions.edit')}
                      >
                        <Pencil size={15} />
                      </Link>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => setToDelete(user)}
                          className="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                          title={t('common.actions.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toEditPerms && <PermissoesModal user={toEditPerms} onClose={() => setToEditPerms(null)} />}
      {toDelete && (
        <ConfirmModal
          user={toDelete}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
