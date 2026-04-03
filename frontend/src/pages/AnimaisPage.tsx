import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { offlineAnimalApi as animalApi, offlineFazendaApi as fazendaApi } from '@/lib/offline-api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AnimaisPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [fazendaId, setFazendaId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: fazendas } = useQuery({
    queryKey: ['fazendas-select'],
    queryFn: () => fazendaApi.list({ limit: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['animais', fazendaId, search, page],
    queryFn: () =>
      animalApi.list({
        fazenda_id: fazendaId || undefined,
        q: search || undefined,
        page,
        limit: 20,
      }),
  });

  const totalizadores = useQuery({
    queryKey: ['totalizadores', fazendaId],
    queryFn: () => animalApi.totalizadores(fazendaId),
    enabled: Boolean(fazendaId),
  });

  const deleteMutation = useMutation({
    mutationFn: animalApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['totalizadores'] });
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm(t('animais.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const sexoLabel = (sexo: string) => (sexo === 'M' ? t('animais.sex.male') : t('animais.sex.female'));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{t('animais.title')}</h1>
        <Link
          to="/animais/novo"
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
        >
          <Plus size={18} />
          {t('animais.new')}
        </Link>
      </div>

      <div className="mb-4 rounded-lg bg-white shadow">
        <div className="flex flex-wrap gap-4 p-4">
          <select
            className="rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            value={fazendaId}
            onChange={(e) => {
              setFazendaId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('animais.allFarms')}</option>
            {fazendas?.items.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome_fantasia}
              </option>
            ))}
          </select>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('animais.searchPlaceholder')}
              className="w-full rounded-lg border py-2 pr-4 pl-10 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {fazendaId && totalizadores.data && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {[
            { label: t('animais.stats.total'), value: totalizadores.data.total_animais },
            { label: t('animais.stats.males'), value: totalizadores.data.total_machos },
            { label: t('animais.stats.females'), value: totalizadores.data.total_femeas },
            { label: t('animais.stats.cows'), value: totalizadores.data.total_vaca },
            { label: t('animais.stats.bulls'), value: totalizadores.data.total_touro },
            { label: t('animais.stats.young'), value: totalizadores.data.total_cria },
            { label: t('animais.stats.growth'), value: totalizadores.data.total_recria },
            { label: t('animais.stats.fattening'), value: totalizadores.data.total_engorda },
            { label: t('animais.stats.lotCost'), value: formatCurrency(totalizadores.data.custo_total_lote) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-white p-3 text-center shadow">
              <div className="text-xs text-gray-500 uppercase">{label}</div>
              <div className="text-lg font-bold text-primary-700">{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-white shadow">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">{t('animais.table.farm')}</th>
                    <th className="px-4 py-3 text-left">{t('animais.table.lot')}</th>
                    <th className="px-4 py-3 text-left">{t('animais.table.identification')}</th>
                    <th className="px-4 py-3 text-left">{t('animais.table.sex')}</th>
                    <th className="px-4 py-3 text-left">{t('animais.table.category')}</th>
                    <th className="px-4 py-3 text-right">{t('animais.table.weight')}</th>
                    <th className="px-4 py-3 text-right">{t('animais.table.purchasePrice')}</th>
                    <th className="px-4 py-3 text-left">{t('animais.table.dateAdded')}</th>
                    <th className="px-4 py-3 text-center">{t('common.fields.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.items.map((a) => {
                    const cats =
                      [
                        a.is_vaca && t('animais.categories.cow'),
                        a.is_touro && t('animais.categories.bull'),
                        a.is_cria && t('animais.categories.young'),
                        a.is_recria && t('animais.categories.growth'),
                        a.is_engorda && t('animais.categories.fattening'),
                      ]
                        .filter(Boolean)
                        .join(', ') || '-';

                    return (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{fazendas?.items.find((f) => f.id === a.fazenda_id)?.nome_fantasia ?? '-'}</td>
                        <td className="px-4 py-3 font-mono">{a.lote_numero}</td>
                        <td className="px-4 py-3">{a.codigo_identificacao || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              a.sexo === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                            }`}
                          >
                            {sexoLabel(a.sexo)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{cats}</td>
                        <td className="px-4 py-3 text-right">{a.peso_inicial_kg ?? '-'}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(a.preco_compra)}</td>
                        <td className="px-4 py-3">{formatDate(a.data_cadastro)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <Link to={`/animais/${a.id}/editar`} className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                              <Pencil size={16} />
                            </Link>
                            <button onClick={() => handleDelete(a.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        {t('animais.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {data && data.pages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <span className="text-sm text-gray-600">
                  {t('common.pagination.summary', { count: data.total, page: data.page, pages: data.pages })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    {t('common.actions.previous')}
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= data.pages}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    {t('common.actions.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
