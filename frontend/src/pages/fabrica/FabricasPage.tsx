import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { offlineFabricaApi } from '@/lib/fabrica-offline';
import { useAuth } from '@/hooks/useAuth';

export default function FabricasPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = !!user?.is_admin;
  const [search, setSearch] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['fab-fabricas', search, filtroAtivo, page],
    queryFn: () => offlineFabricaApi.list({
      q: search || undefined,
      ativo: filtroAtivo === '' ? undefined : filtroAtivo === 'true',
      page,
      limit: 20,
    }),
  });

  useEffect(() => { setSelectedIds(new Set()); }, [search, filtroAtivo, page]);

  const allItems = data?.items ?? [];
  const allSelected = allItems.length > 0 && allItems.every((fabrica) => selectedIds.has(fabrica.id));
  const someSelected = allItems.some((fabrica) => selectedIds.has(fabrica.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItems.map((fabrica) => fabrica.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteMutation = useMutation({
    mutationFn: offlineFabricaApi.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fab-fabricas'] }),
  });

  const handleDelete = (id: string, nome: string) => {
    if (window.confirm(t('fabricas.deleteConfirm', { name: nome }))) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!window.confirm(t('fabricas.bulkDeleteConfirm', { count }))) return;
    for (const id of selectedIds) {
      await offlineFabricaApi.deactivate(id);
    }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['fab-fabricas'] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('fabricas.title')}</h1>
        {canManage && (
          <Link
            to="/fabrica/unidades/novo"
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={18} />
            {t('fabricas.new')}
          </Link>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-red-700">{t('fabricas.selected', { count: selectedIds.size })}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('common.actions.cancel')}
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 size={15} />
              {t('common.actions.deleteSelected')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('fabricas.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <select
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filtroAtivo}
            onChange={(event) => { setFiltroAtivo(event.target.value); setPage(1); }}
          >
            <option value="">{t('fabricas.filters.all')}</option>
            <option value="true">{t('fabricas.filters.active')}</option>
            <option value="false">{t('fabricas.filters.inactive')}</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        disabled={allItems.length === 0}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">{t('common.fields.name')}</th>
                    <th className="px-4 py-3 text-left">{t('fabricas.table.orderEmail')}</th>
                    <th className="px-4 py-3 text-center">{t('common.fields.status')}</th>
                    <th className="px-4 py-3 text-center">{t('common.fields.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.items.map((fabrica) => (
                    <tr key={fabrica.id} className={`hover:bg-gray-50 ${selectedIds.has(fabrica.id) ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(fabrica.id)}
                          onChange={() => toggleOne(fabrica.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{fabrica.nome}</td>
                      <td className="px-4 py-3 text-gray-600">{fabrica.email_pedido || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          fabrica.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {fabrica.ativo ? t('common.status.active') : t('common.status.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Link
                            to={`/fabrica/unidades/${fabrica.id}/editar`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Pencil size={16} />
                          </Link>
                          {fabrica.ativo && (
                            <button
                              onClick={() => handleDelete(fabrica.id, fabrica.nome)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        {t('fabricas.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {data && data.pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-gray-600">
                  {t('common.pagination.summary', { count: data.total, page: data.page, pages: data.pages })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    {t('common.actions.previous')}
                  </button>
                  <button
                    onClick={() => setPage((value) => value + 1)}
                    disabled={page >= data.pages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    {t('common.actions.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {deleteMutation.isError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {(deleteMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('fabricas.deleteError')}
        </div>
      )}
    </div>
  );
}
