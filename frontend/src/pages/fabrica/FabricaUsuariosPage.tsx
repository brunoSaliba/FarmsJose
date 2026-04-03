import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Trash2, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fabricaApi } from '@/lib/fabrica-api';
import { useFabrica } from '@/hooks/useFabrica';
import { useAuth } from '@/hooks/useAuth';
import type { FabricaCreateUser, PapelFabrica } from '@/types/fabrica';

export function FabricaUsuariosPage() {
  const { t } = useTranslation();
  const { activeFabrica, meuPapel } = useFabrica();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const schema = z.object({
    nome: z.string().min(2, t('fabricaForm.validation.shortName')),
    email: z.string().email(t('fabricaForm.validation.invalidEmail')),
    password: z.string().min(4, t('fabricaForm.validation.minPassword')),
    papel: z.enum(['superusuario', 'seller'] as const),
  });

  type FormData = z.infer<typeof schema>;

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['fab-usuarios', activeFabrica?.id],
    queryFn: () => fabricaApi.listarUsuarios(activeFabrica!.id),
    enabled: !!activeFabrica,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { papel: 'seller' },
  });

  const createMut = useMutation({
    mutationFn: (data: FabricaCreateUser) => fabricaApi.criarUsuario(activeFabrica!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fab-usuarios', activeFabrica?.id] });
      reset();
      setShowForm(false);
    },
  });

  const removeMut = useMutation({
    mutationFn: (vinculoId: string) => fabricaApi.removerUsuario(activeFabrica!.id, vinculoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fab-usuarios', activeFabrica?.id] });
    },
  });

  const isAdmin = meuPapel === 'superusuario' || !!user?.is_admin;

  if (!activeFabrica) {
    return <div className="p-6 text-gray-500">{t('fabricaUsuarios.selectFactory')}</div>;
  }

  const papelLabel = (papel: PapelFabrica) => t(`fabricaUsuarios.roles.${papel}`);

  const papelIcon = (papel: PapelFabrica) =>
    papel === 'superusuario' ? (
      <ShieldCheck className="w-4 h-4 text-blue-600" />
    ) : (
      <ShoppingBag className="w-4 h-4 text-green-600" />
    );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('fabricaUsuarios.title')}</h1>
          <p className="text-gray-500 text-sm">{activeFabrica.nome}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((value) => !value)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            {t('fabricaUsuarios.new')}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit((data) => createMut.mutate(data))}
          className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
        >
          <h2 className="font-semibold text-gray-800">{t('fabricaUsuarios.createTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.fields.name')}</label>
              <input
                {...register('nome')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder={t('common.fields.fullName')}
              />
              {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.fields.email')}</label>
              <input
                {...register('email')}
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="email@exemplo.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fabricaUsuarios.fields.password')}</label>
              <input
                {...register('password')}
                type="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder={t('fabricaForm.placeholders.password')}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fabricaUsuarios.fields.profile')}</label>
              <select
                {...register('papel')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="seller">{t('fabricaUsuarios.roles.seller')}</option>
                <option value="superusuario">{t('fabricaUsuarios.roles.superusuario')}</option>
              </select>
            </div>
          </div>
          {createMut.isError && (
            <p className="text-red-500 text-sm">
              {(createMut.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? t('fabricaUsuarios.createError')}
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); reset(); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMut.isPending}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {createMut.isPending ? t('fabricaUsuarios.creating') : t('fabricaUsuarios.createAction')}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t('fabricaUsuarios.empty')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.fields.name')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.fields.email')}</th>
                {user?.is_admin && <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.fields.factory')}</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('fabricaUsuarios.fields.profile')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.fields.status')}</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{usuario.user_nome}</td>
                  <td className="px-4 py-3 text-gray-500">{usuario.user_email}</td>
                  {user?.is_admin && <td className="px-4 py-3 text-gray-500">{activeFabrica?.nome ?? '-'}</td>}
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      {papelIcon(usuario.papel)}
                      {papelLabel(usuario.papel)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${usuario.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {usuario.ativo ? t('common.status.active') : t('common.status.inactive')}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      {usuario.ativo && (
                        <button
                          onClick={() => removeMut.mutate(usuario.id)}
                          disabled={removeMut.isPending}
                          className="text-red-500 hover:text-red-700 p-1 rounded disabled:opacity-50"
                          title={t('common.actions.removeAccess')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
