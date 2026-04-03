import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { offlineAnimalApi as animalApi, offlineFazendaApi as fazendaApi } from '@/lib/offline-api';

type FormData = {
  fazenda_id: string;
  lote_numero: number;
  tipo_identificacao?: string;
  codigo_identificacao?: string;
  sexo: 'M' | 'F';
  is_vaca: boolean;
  is_touro: boolean;
  is_cria: boolean;
  is_recria: boolean;
  is_engorda: boolean;
  idade_meses?: number | '';
  peso_inicial_kg?: number | '';
  preco_compra: number;
  origem?: string;
  historico_sanitario?: string;
  data_primeira_pesagem?: string;
};

export default function AnimalFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const schema = z.object({
    fazenda_id: z.string().min(1, t('animalForm.validation.selectFarm')),
    lote_numero: z.coerce.number().min(1, t('animalForm.validation.lotRequired')),
    tipo_identificacao: z.string().optional(),
    codigo_identificacao: z.string().optional(),
    sexo: z.enum(['M', 'F'], { required_error: t('animalForm.validation.selectSex') }),
    is_vaca: z.boolean().default(false),
    is_touro: z.boolean().default(false),
    is_cria: z.boolean().default(false),
    is_recria: z.boolean().default(false),
    is_engorda: z.boolean().default(false),
    idade_meses: z.coerce.number().min(0).optional().or(z.literal('')),
    peso_inicial_kg: z.coerce.number().min(0).optional().or(z.literal('')),
    preco_compra: z.coerce.number().min(0).default(0),
    origem: z.string().optional(),
    historico_sanitario: z.string().optional(),
    data_primeira_pesagem: z.string().optional(),
  });

  const { data: fazendas } = useQuery({
    queryKey: ['fazendas-select'],
    queryFn: () => fazendaApi.list({ limit: 100 }),
  });

  const { data: animal } = useQuery({
    queryKey: ['animal', id],
    queryFn: () => animalApi.get(id!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sexo: 'M', preco_compra: 0 },
  });

  const sexo = watch('sexo');

  useEffect(() => {
    if (animal) {
      reset({
        fazenda_id: animal.fazenda_id,
        lote_numero: animal.lote_numero,
        tipo_identificacao: animal.tipo_identificacao || '',
        codigo_identificacao: animal.codigo_identificacao || '',
        sexo: animal.sexo,
        is_vaca: animal.is_vaca,
        is_touro: animal.is_touro,
        is_cria: animal.is_cria,
        is_recria: animal.is_recria,
        is_engorda: animal.is_engorda,
        idade_meses: animal.idade_meses ?? '',
        peso_inicial_kg: animal.peso_inicial_kg ?? '',
        preco_compra: animal.preco_compra,
        origem: animal.origem || '',
        historico_sanitario: animal.historico_sanitario || '',
        data_primeira_pesagem: animal.data_primeira_pesagem || '',
      });
    }
  }, [animal, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        idade_meses: data.idade_meses === '' ? null : Number(data.idade_meses),
        peso_inicial_kg: data.peso_inicial_kg === '' ? null : Number(data.peso_inicial_kg),
        data_primeira_pesagem: data.data_primeira_pesagem || null,
        tipo_identificacao: data.tipo_identificacao || null,
        codigo_identificacao: data.codigo_identificacao || null,
        origem: data.origem || null,
        historico_sanitario: data.historico_sanitario || null,
      };
      return isEdit ? animalApi.update(id!, payload) : animalApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      navigate('/animais');
    },
  });

  const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700';
  const checkClass = 'flex items-center gap-2 text-sm';

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{isEdit ? t('animalForm.editTitle') : t('animalForm.newTitle')}</h1>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="rounded-lg bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>{t('animalForm.fields.farm')}</label>
            <select {...register('fazenda_id')} className={inputClass} disabled={isEdit}>
              <option value="">{t('common.select.placeholder')}</option>
              {fazendas?.items.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome_fantasia}
                </option>
              ))}
            </select>
            {errors.fazenda_id && <p className="mt-1 text-xs text-red-500">{errors.fazenda_id.message}</p>}
          </div>
          <div>
            <label className={labelClass}>{t('animalForm.fields.lotNumber')}</label>
            <input {...register('lote_numero')} type="number" min={1} className={inputClass} />
            {errors.lote_numero && <p className="mt-1 text-xs text-red-500">{errors.lote_numero.message}</p>}
          </div>
          <div>
            <label className={labelClass}>{t('animalForm.fields.sex')}</label>
            <select {...register('sexo')} className={inputClass}>
              <option value="M">{t('animais.sex.male')}</option>
              <option value="F">{t('animais.sex.female')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('animalForm.fields.identificationType')}</label>
            <input {...register('tipo_identificacao')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('animalForm.fields.identificationCode')}</label>
            <input {...register('codigo_identificacao')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('animalForm.fields.ageMonths')}</label>
            <input {...register('idade_meses')} type="number" min={0} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('animalForm.fields.initialWeight')}</label>
            <input {...register('peso_inicial_kg')} type="number" min={0} step="0.01" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('animalForm.fields.purchasePrice')}</label>
            <input {...register('preco_compra')} type="number" min={0} step="0.01" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('animalForm.fields.origin')}</label>
            <input {...register('origem')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('animalForm.fields.firstWeightDate')}</label>
            <input {...register('data_primeira_pesagem')} type="date" className={inputClass} />
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>{t('animalForm.fields.categories')}</label>
          <div className="mt-1 flex flex-wrap gap-6">
            <label className={checkClass}>
              <input {...register('is_vaca')} type="checkbox" disabled={sexo === 'M'} className="h-4 w-4 accent-primary-600" />
              {t('animais.categories.cow')}
            </label>
            <label className={checkClass}>
              <input {...register('is_touro')} type="checkbox" disabled={sexo === 'F'} className="h-4 w-4 accent-primary-600" />
              {t('animais.categories.bull')}
            </label>
            <label className={checkClass}>
              <input {...register('is_cria')} type="checkbox" className="h-4 w-4 accent-primary-600" />
              {t('animais.categories.young')}
            </label>
            <label className={checkClass}>
              <input {...register('is_recria')} type="checkbox" className="h-4 w-4 accent-primary-600" />
              {t('animais.categories.growth')}
            </label>
            <label className={checkClass}>
              <input {...register('is_engorda')} type="checkbox" className="h-4 w-4 accent-primary-600" />
              {t('animais.categories.fattening')}
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>{t('animalForm.fields.sanitaryHistory')}</label>
          <textarea {...register('historico_sanitario')} rows={3} className={inputClass} />
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
          <button type="button" onClick={() => navigate('/animais')} className="rounded-lg border px-6 py-2 hover:bg-gray-50">
            {t('common.actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
