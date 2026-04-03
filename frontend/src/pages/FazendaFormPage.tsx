import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { offlineFazendaApi as fazendaApi } from '@/lib/offline-api';
import { maskCnpj, maskCpf, maskPhone, maskCep, unmask } from '@/lib/utils';
import { lookupCep } from '@/lib/cep';

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

type FormData = {
  razao_social: string;
  nome_fantasia: string;
  cnpj?: string;
  cpf?: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  numero_km?: string;
  bairro?: string;
  ponto_referencia?: string;
  cep?: string;
  email?: string;
  caixa_postal?: string;
  cidade?: string;
  estado?: string;
};

export default function FazendaFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const schema = z.object({
    razao_social: z.string().min(1, t('fazendaForm.validation.businessNameRequired')),
    nome_fantasia: z.string().min(1, t('fazendaForm.validation.tradeNameRequired')),
    cnpj: z.string().optional(),
    cpf: z.string().optional(),
    telefone: z.string().optional(),
    celular: z.string().optional(),
    endereco: z.string().optional(),
    numero_km: z.string().optional(),
    bairro: z.string().optional(),
    ponto_referencia: z.string().optional(),
    cep: z.string().optional(),
    email: z.string().email(t('fazendaForm.validation.invalidEmail')).optional().or(z.literal('')),
    caixa_postal: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
  });

  const { data: fazenda } = useQuery({
    queryKey: ['fazenda', id],
    queryFn: () => fazendaApi.get(id!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  async function handleCepLookup() {
    const raw = watch('cep') ?? '';
    setCepError(null);
    setCepLoading(true);
    try {
      const result = await lookupCep(raw);
      if (result.logradouro) setValue('endereco', result.logradouro);
      if (result.bairro) setValue('bairro', result.bairro);
      if (result.localidade) setValue('cidade', result.localidade);
      if (result.uf) setValue('estado', result.uf);
    } catch (e: unknown) {
      setCepError(e instanceof Error ? e.message : t('fazendaForm.lookupCepError'));
    } finally {
      setCepLoading(false);
    }
  }

  useEffect(() => {
    if (fazenda) {
      reset({
        razao_social: fazenda.razao_social,
        nome_fantasia: fazenda.nome_fantasia,
        cnpj: fazenda.cnpj ? maskCnpj(fazenda.cnpj) : '',
        cpf: fazenda.cpf ? maskCpf(fazenda.cpf) : '',
        telefone: fazenda.telefone ? maskPhone(fazenda.telefone) : '',
        celular: fazenda.celular ? maskPhone(fazenda.celular) : '',
        endereco: fazenda.endereco || '',
        numero_km: fazenda.numero_km || '',
        bairro: fazenda.bairro || '',
        ponto_referencia: fazenda.ponto_referencia || '',
        cep: fazenda.cep ? maskCep(fazenda.cep) : '',
        email: fazenda.email || '',
        caixa_postal: fazenda.caixa_postal || '',
        cidade: fazenda.cidade || '',
        estado: fazenda.estado || '',
      });
    }
  }, [fazenda, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        cnpj: data.cnpj ? unmask(data.cnpj) : null,
        cpf: data.cpf ? unmask(data.cpf) : null,
        telefone: data.telefone ? unmask(data.telefone) : null,
        celular: data.celular ? unmask(data.celular) : null,
        cep: data.cep ? unmask(data.cep) : null,
        email: data.email || null,
      };
      return isEdit ? fazendaApi.update(id!, payload) : fazendaApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fazendas'] });
      navigate('/fazendas');
    },
  });

  const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{isEdit ? t('fazendaForm.editTitle') : t('fazendaForm.newTitle')}</h1>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="rounded-lg bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.businessName')}</label>
            <input {...register('razao_social')} className={inputClass} />
            {errors.razao_social && <p className="mt-1 text-xs text-red-500">{errors.razao_social.message}</p>}
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.tradeName')}</label>
            <input {...register('nome_fantasia')} className={inputClass} />
            {errors.nome_fantasia && <p className="mt-1 text-xs text-red-500">{errors.nome_fantasia.message}</p>}
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.cnpj')}</label>
            <input
              {...register('cnpj')}
              className={inputClass}
              onChange={(e) => setValue('cnpj', maskCnpj(e.target.value))}
              maxLength={18}
            />
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.cpf')}</label>
            <input
              {...register('cpf')}
              className={inputClass}
              onChange={(e) => setValue('cpf', maskCpf(e.target.value))}
              maxLength={14}
            />
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.phone')}</label>
            <input
              {...register('telefone')}
              className={inputClass}
              onChange={(e) => setValue('telefone', maskPhone(e.target.value))}
              maxLength={15}
            />
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.mobile')}</label>
            <input
              {...register('celular')}
              className={inputClass}
              onChange={(e) => setValue('celular', maskPhone(e.target.value))}
              maxLength={15}
            />
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.email')}</label>
            <input {...register('email')} type="email" className={inputClass} />
          </div>
          <div className="lg:col-span-2">
            <label className={labelClass}>{t('fazendaForm.fields.address')}</label>
            <input {...register('endereco')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.numberKm')}</label>
            <input {...register('numero_km')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.district')}</label>
            <input {...register('bairro')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.reference')}</label>
            <input {...register('ponto_referencia')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.cep')}</label>
            <div className="flex gap-2">
              <input
                {...register('cep')}
                className={inputClass}
                onChange={(e) => {
                  setValue('cep', maskCep(e.target.value));
                  setCepError(null);
                }}
                onBlur={() => {
                  if ((watch('cep') ?? '').replace(/\D/g, '').length === 8) handleCepLookup();
                }}
                maxLength={9}
                placeholder={t('fazendaForm.cepPlaceholder')}
              />
              <button
                type="button"
                onClick={handleCepLookup}
                disabled={cepLoading}
                title={t('common.actions.searchCep')}
                className="flex-shrink-0 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                {cepLoading ? (
                  <span className="block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-gray-700" />
                ) : (
                  <Search size={16} className="text-gray-600" />
                )}
              </button>
            </div>
            {cepError && <p className="mt-1 text-xs text-red-500">{cepError}</p>}
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.city')}</label>
            <input {...register('cidade')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.state')}</label>
            <select {...register('estado')} className={inputClass}>
              <option value="">{t('common.select.placeholder')}</option>
              {ESTADOS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('fazendaForm.fields.poBox')}</label>
            <input {...register('caixa_postal')} className={inputClass} />
          </div>
        </div>

        {mutation.isError && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
              t('common.messages.saveError')}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save size={18} />
            {isEdit ? t('common.actions.update') : t('common.actions.create')}
          </button>
          <button type="button" onClick={() => navigate('/fazendas')} className="rounded-lg border px-6 py-2 hover:bg-gray-50">
            {t('common.actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
