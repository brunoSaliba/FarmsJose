import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { configuracaoApi } from '@/lib/fabrica-api';

const SMTP_KEYS = [
  { chave: 'smtp_host', labelKey: 'configuracoesAdmin.fields.smtpHost', placeholderKey: 'configuracoesAdmin.placeholders.smtpHost' },
  { chave: 'smtp_port', labelKey: 'configuracoesAdmin.fields.smtpPort', placeholderKey: 'configuracoesAdmin.placeholders.smtpPort', type: 'number' },
  { chave: 'smtp_user', labelKey: 'configuracoesAdmin.fields.smtpUser', placeholderKey: 'configuracoesAdmin.placeholders.smtpUser' },
  { chave: 'smtp_password', labelKey: 'configuracoesAdmin.fields.smtpPassword', placeholderKey: 'configuracoesAdmin.placeholders.smtpPassword', type: 'password' },
  { chave: 'smtp_tls', labelKey: 'configuracoesAdmin.fields.smtpTls', placeholderKey: 'configuracoesAdmin.placeholders.smtpTls' },
  { chave: 'email_from_name', labelKey: 'configuracoesAdmin.fields.fromName', placeholderKey: 'configuracoesAdmin.placeholders.fromName' },
  { chave: 'email_empresa', labelKey: 'configuracoesAdmin.fields.companyEmail', placeholderKey: 'configuracoesAdmin.placeholders.companyEmail' },
] as const satisfies ReadonlyArray<{
  chave: string;
  labelKey: string;
  placeholderKey: string;
  type?: string;
}>;

type FormData = Record<string, string>;

export default function ConfiguracoesAdminPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['fab-configuracoes'],
    queryFn: () => configuracaoApi.list(),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<FormData>();

  useEffect(() => {
    if (configs) {
      const values: FormData = {};
      for (const config of configs) {
        values[config.chave] = config.valor;
      }
      reset(values);
    }
  }, [configs, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const promises = SMTP_KEYS.map(({ chave }) => {
        const value = data[chave];
        if (value === undefined || value === '' || value === '__SET__') {
          return Promise.resolve();
        }
        return configuracaoApi.upsert(chave, { valor: value });
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fab-configuracoes'] });
    },
  });

  const inputClass =
    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">{t('configuracoesAdmin.title')}</h1>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="rounded-lg bg-white p-6 shadow">
        <p className="mb-6 text-sm text-gray-500">{t('configuracoesAdmin.description')}</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SMTP_KEYS.map((field) => {
            const type = 'type' in field ? field.type : undefined;
            const isMasked = type === 'password' && watch(field.chave) === '__SET__';

            return (
              <div key={field.chave}>
                <label className={labelClass}>{t(field.labelKey)}</label>
                <input
                  {...register(field.chave)}
                  type={type ?? 'text'}
                  placeholder={isMasked ? t('configuracoesAdmin.passwordConfigured') : t(field.placeholderKey)}
                  className={inputClass}
                />
                {isMasked && <p className="mt-1 text-xs text-amber-600">{t('configuracoesAdmin.passwordHint')}</p>}
              </div>
            );
          })}
        </div>

        {mutation.isError && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
              t('configuracoesAdmin.saveError')}
          </div>
        )}

        {mutation.isSuccess && (
          <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {t('configuracoesAdmin.saveSuccess')}
          </div>
        )}

        <div className="mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save size={18} />
            {t('configuracoesAdmin.saveAction')}
          </button>
        </div>
      </form>
    </div>
  );
}
