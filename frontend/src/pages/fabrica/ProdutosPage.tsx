import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { offlineProdutoApi } from '@/lib/fabrica-offline';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useFabrica } from '@/hooks/useFabrica';

export default function ProdutosPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeFabrica } = useFabrica();
  const [search, setSearch] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['fab-produtos', activeFabrica?.id, search, filtroAtivo, page],
    queryFn: () => offlineProdutoApi.list({
      q: search || undefined,
      ativo: filtroAtivo === '' ? undefined : filtroAtivo === 'true',
      page,
      limit: 20,
    }),
  });

  // Clear selection when page/filter changes
  useEffect(() => { setSelectedIds(new Set()); }, [search, filtroAtivo, page]);

  const allItems = data?.items ?? [];
  const allSelected = allItems.length > 0 && allItems.every(p => selectedIds.has(p.id));
  const someSelected = allItems.some(p => selectedIds.has(p.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItems.map(p => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteMutation = useMutation({
    mutationFn: offlineProdutoApi.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fab-produtos'] }),
  });

  const handleDelete = (id: string, nome: string) => {
    if (window.confirm(`Deseja excluir o produto "${nome}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!window.confirm(`Deseja excluir ${count} produto(s) selecionado(s)?`)) return;
    for (const id of selectedIds) {
      await offlineProdutoApi.deactivate(id);
    }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['fab-produtos'] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
        <Link
          to="/fabrica/produtos/novo"
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          Novo Produto
        </Link>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-red-700">{selectedIds.size} produto(s) selecionado(s)</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 size={15} />
              Excluir selecionados
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
              placeholder="Buscar por nome ou descricao..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filtroAtivo}
            onChange={(e) => { setFiltroAtivo(e.target.value); setPage(1); }}
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
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
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Descricao</th>
                    <th className="px-4 py-3 text-left">Unidade</th>
                    <th className="px-4 py-3 text-right">Preco</th>
                    {user?.is_admin && <th className="px-4 py-3 text-left">Fabrica</th>}
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.items.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 ${selectedIds.has(p.id) ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleOne(p.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{p.nome}</td>
                      <td className="px-4 py-3 text-gray-600">{p.sku || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{p.descricao || '-'}</td>
                      <td className="px-4 py-3">{p.unidade}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(p.preco)}</td>
                      {user?.is_admin && <td className="px-4 py-3 text-gray-600">{activeFabrica?.nome ?? '-'}</td>}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {p.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Link
                            to={`/fabrica/produtos/${p.id}/editar`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Pencil size={16} />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.nome)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={user?.is_admin ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                        Nenhum produto encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {data && data.pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-gray-600">
                  {data.total} registro(s) - Pagina {data.page} de {data.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= data.pages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Proximo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {deleteMutation.isError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {(deleteMutation.error as any)?.response?.data?.detail || 'Erro ao excluir produto'}
        </div>
      )}
    </div>
  );
}
