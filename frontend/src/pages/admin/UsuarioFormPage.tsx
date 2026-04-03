import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save } from 'lucide-react';
import { authApi } from '@/lib/api';

const MODULES = [
  {
    value: 'animais',
    labelKey: 'adminUsers.modules.animais.label',
    badge: null,
  },
  {
    value: 'fabrica',
    labelKey: 'adminUsers.modules.fabrica.label',
    badge: 'adminUsuarioForm.badges.superuserModule',
  },
] as const;

type FormData = {
  nome: string;
  email: string;
  password: string;
  is_admin: boolean;
  is_active: boolean;
  modulos: string[];
};

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const labelClass = 'mb-1 block text-sm font-medium text-gray-700';
const errorClass = 'mt-1 text-xs text-red-600';

export default function UsuarioFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const schema = z.object({
    nome: z.string().min(2, t('adminUsuarioForm.validation.minTwo')).max(200),
    email: z.string().email(t('adminUsuarioForm.validation.invalidEmail')),
    password: isEdit
      ? z.string().min(4, t('adminUsuarioForm.validation.minPassword')).optional().or(z.literal(''))
      : z.string().min(4, t('adminUsuarioForm.validation.minPassword')),
    is_admin: z.boolean(),
    is_active: z.boolean(),
    modulos: z.array(z.string()),
  });

  const { data: existing, isLoading: loadingUser } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => authApi.listUsers().then((users) => users.find((user) => user.id === id) ?? null),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      email: '',
      password: '',
      is_admin: false,
      is_active: true,
      modulos: [],
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        nome: existing.nome,
        email: existing.email,
        password: '',
        is_admin: existing.is_admin,
        is_active: existing.is_active,
        modulos: existing.modulos,
      });
    }
  }, [existing, reset]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => authApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      navigate('/admin/usuarios');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Parameters<typeof authApi.updateUser>[1] = {
        nome: data.nome,
        email: data.email,
        is_admin: data.is_admin,
        is_active: data.is_active,
        modulos: data.modulos,
      };

      if (data.password) {
        payload.password = data.password;
      }

      return authApi.updateUser(id!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      navigate('/admin/usuarios');
    },
  });

  const onSubmit = handleSubmit((data) => {
    if (isEdit) {
      updateMutation.mutate(data);
      return;
    }

    createMutation.mutate(data);
  });

  const serverError =
    (createMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
    (updateMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;

  const watchedModulos = watch('modulos');

  function toggleModulo(value: string) {
    const current = watchedModulos ?? [];

    if (current.includes(value)) {
      setValue(
        'modulos',
        current.filter((moduleName) => moduleName !== value),
        { shouldValidate: true }
      );
      return;
    }

    setValue('modulos', [...current, value], { shouldValidate: true });
  }

  if (isEdit && loadingUser) {
    return <div className="p-12 text-center text-gray-400">{t('common.loading')}</div>;
  }

  if (isEdit && !existing && !loadingUser) {
    return <div className="p-12 text-center text-red-500">{t('adminUsuarioForm.notFound')}</div>;
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/usuarios')}
          className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEdit ? t('adminUsuarioForm.editTitle') : t('adminUsuarioForm.newTitle')}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="divide-y rounded-lg bg-white shadow">
        <div className="space-y-4 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t('adminUsuarioForm.sections.basic')}
          </h2>

          <div>
            <label className={labelClass}>{t('adminUsuarioForm.fields.name')}</label>
            <input {...register('nome')} className={inputClass} placeholder={t('adminUsuarioForm.placeholders.fullName')} />
            {errors.nome && <p className={errorClass}>{errors.nome.message}</p>}
          </div>

          <div>
            <label className={labelClass}>{t('adminUsuarioForm.fields.email')}</label>
            <input
              {...register('email')}
              type="email"
              className={inputClass}
              placeholder={t('adminUsuarioForm.placeholders.email')}
            />
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
          </div>

          <div>
            <label className={labelClass}>
              {isEdit ? t('adminUsuarioForm.fields.passwordEdit') : t('adminUsuarioForm.fields.passwordCreate')}
            </label>
            <input
              {...register('password')}
              type="password"
              className={inputClass}
              placeholder={isEdit ? t('adminUsuarioForm.placeholders.keepPassword') : t('adminUsuarioForm.placeholders.password')}
              autoComplete="new-password"
            />
            {errors.password && <p className={errorClass}>{errors.password.message}</p>}
          </div>
        </div>

        <div className="space-y-4 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t('adminUsuarioForm.sections.permissions')}
          </h2>

          <div className="flex items-center gap-3">
            <input
              {...register('is_admin')}
              id="is_admin"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_admin" className="text-sm font-medium text-gray-700">
              {t('adminUsuarioForm.fields.systemAdmin')}
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              {...register('is_active')}
              id="is_active"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              {t('adminUsuarioForm.fields.activeUser')}
            </label>
          </div>

          <div>
            <label className={labelClass}>{t('adminUsuarioForm.fields.accessModules')}</label>
            <div className="mt-1 space-y-2">
              {MODULES.map(({ value, labelKey, badge }) => (
                <label key={value} className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={watchedModulos?.includes(value) ?? false}
                    onChange={() => toggleModulo(value)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{t(labelKey)}</span>
                  {badge && (
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                      {t(badge)}
                    </span>
                  )}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">{t('adminUsuarioForm.adminHint')}</p>
          </div>
        </div>

        <div className="space-y-3 p-6">
          {serverError && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-700 py-2 font-medium text-white transition-colors hover:bg-primary-800 disabled:opacity-50"
          >
            <Save size={16} />
            {isSubmitting || createMutation.isPending || updateMutation.isPending
              ? t('common.loading')
              : t('common.actions.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
