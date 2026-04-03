import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
import { offlineFazendaApi as fazendaApi, offlineCustoApi as custoApi, offlineAnimalApi as animalApi } from '@/lib/offline-api';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function ResumoPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [fazendaId, setFazendaId] = useState('');

  const { data: fazendas } = useQuery({
    queryKey: ['fazendas-select'],
    queryFn: () => fazendaApi.list({ limit: 100 }),
  });

  const { data: resumo, isLoading } = useQuery({
    queryKey: ['resumo', fazendaId],
    queryFn: () => custoApi.resumo(fazendaId),
    enabled: Boolean(fazendaId),
  });

  const { data: totalizadores } = useQuery({
    queryKey: ['totalizadores', fazendaId],
    queryFn: () => animalApi.totalizadores(fazendaId),
    enabled: Boolean(fazendaId),
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { custo_mensal: 0, custo_total_animal: 0, preco_venda: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: { custo_mensal: number; custo_total_animal: number; preco_venda: number }) =>
      custoApi.update(fazendaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumo', fazendaId] });
    },
  });

  const handleFazendaChange = (id: string) => {
    setFazendaId(id);
    if (id) {
      custoApi.resumo(id).then(r => {
        reset({
          custo_mensal: Number(r.custo_mensal),
          custo_total_animal: Number(r.custo_total_animal),
          preco_venda: Number(r.preco_venda),
        });
      }).catch(() => {
        reset({ custo_mensal: 0, custo_total_animal: 0, preco_venda: 0 });
      });
    }
  };

  const inputClass = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('resumo.title')}</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('resumo.selectFarm')}</label>
        <select
          className="max-w-md px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={fazendaId}
          onChange={(e) => handleFazendaChange(e.target.value)}
        >
          <option value="">{t('common.select.placeholder')}</option>
          {fazendas?.items.map((f) => (
            <option key={f.id} value={f.id}>{f.id_sistema} - {f.nome_fantasia}</option>
          ))}
        </select>
      </div>

      {fazendaId && !isLoading && resumo && (
        <>
          {totalizadores && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
              {[
                { label: t('resumo.stats.totalAnimals'), value: totalizadores.total_animais },
                { label: t('resumo.stats.males'), value: totalizadores.total_machos },
                { label: t('resumo.stats.females'), value: totalizadores.total_femeas },
                { label: t('resumo.stats.cows'), value: totalizadores.total_vaca },
                { label: t('resumo.stats.bulls'), value: totalizadores.total_touro },
                { label: t('resumo.stats.young'), value: totalizadores.total_cria },
                { label: t('resumo.stats.growth'), value: totalizadores.total_recria },
                { label: t('resumo.stats.fattening'), value: totalizadores.total_engorda },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-lg shadow p-3 text-center">
                  <div className="text-xs text-gray-500 uppercase">{label}</div>
                  <div className="text-lg font-bold text-primary-700">{value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('resumo.financialSummary')}</h2>
              <dl className="space-y-3">
                {[
                  { label: t('resumo.stats.lotCost'), value: formatCurrency(Number(resumo.custo_total_lote)) },
                  { label: t('resumo.stats.animals'), value: resumo.total_animais },
                  { label: t('resumo.stats.pricePerAnimal'), value: formatCurrency(Number(resumo.preco_animal)) },
                  { label: t('resumo.stats.monthlyCost'), value: formatCurrency(Number(resumo.custo_mensal)) },
                  { label: t('resumo.stats.dailyCost'), value: formatCurrency(Number(resumo.custo_diario)) },
                  { label: t('resumo.stats.totalAnimalCost'), value: formatCurrency(Number(resumo.custo_total_animal)) },
                  { label: t('resumo.stats.salePrice'), value: formatCurrency(Number(resumo.preco_venda)) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b last:border-0">
                    <dt className="text-sm text-gray-600">{label}</dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                ))}
                <div className="flex justify-between py-3 bg-gray-50 -mx-2 px-4 rounded-lg mt-2">
                  <dt className="font-semibold text-gray-800">{t('resumo.stats.profit')}</dt>
                  <dd className={`font-bold text-lg ${Number(resumo.lucro) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Number(resumo.lucro))}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('resumo.editCosts')}</h2>
              <form onSubmit={handleSubmit((d) => mutation.mutate({
                custo_mensal: Number(d.custo_mensal),
                custo_total_animal: Number(d.custo_total_animal),
                preco_venda: Number(d.preco_venda),
              }))} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('resumo.fields.monthlyCost')}</label>
                  <input {...register('custo_mensal')} type="number" step="0.01" min={0} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('resumo.fields.totalAnimalCost')}</label>
                  <input {...register('custo_total_animal')} type="number" step="0.01" min={0} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('resumo.fields.salePrice')}</label>
                  <input {...register('preco_venda')} type="number" step="0.01" min={0} className={inputClass} />
                </div>
                <button type="submit" className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
                  <Save size={18} />
                  {t('resumo.saveCosts')}
                </button>
                {mutation.isSuccess && (
                  <p className="text-green-600 text-sm">{t('resumo.saveSuccess')}</p>
                )}
              </form>
            </div>
          </div>
        </>
      )}

      {fazendaId && isLoading && (
        <div className="text-center text-gray-500 py-8">{t('resumo.loading')}</div>
      )}
    </div>
  );
}
