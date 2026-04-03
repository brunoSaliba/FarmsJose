import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { offlinePedidoApi, offlineClienteApi } from '@/lib/fabrica-offline';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { StatusPedido } from '@/types/fabrica';
import { useAuth } from '@/hooks/useAuth';
import { useFabrica } from '@/hooks/useFabrica';

const STATUS_BADGE: Record<StatusPedido, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  confirmado: 'bg-blue-100 text-blue-700',
  enviado: 'bg-green-100 text-green-700',
  em_processamento: 'bg-yellow-100 text-yellow-700',
  finalizado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-red-100 text-red-700',
};

const STATUS_VALUES: StatusPedido[] = [
  'rascunho',
  'confirmado',
  'enviado',
  'em_processamento',
  'finalizado',
  'cancelado',
];

export default function PedidosPage() {
  const { t } = useTranslation();
  const [clienteId, setClienteId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const { activeFabrica, meuPapel } = useFabrica();
  const showVendedor = meuPapel === 'superusuario' || !!user?.is_admin;

  const { data: clientes } = useQuery({
    queryKey: ['fab-clientes-select', activeFabrica?.id],
    queryFn: () => offlineClienteApi.list({ ativo: true, limit: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['fab-pedidos', activeFabrica?.id, clienteId, status, page],
    queryFn: () => offlinePedidoApi.list({
      cliente_id: clienteId || undefined,
      status: (status || undefined) as StatusPedido | undefined,
      page,
      limit: 20,
    }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('pedido.title')}</h1>
        <Link
          to="/fabrica/pedidos/novo"
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          {t('pedido.newTitle')}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-4">
          <select
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={clienteId}
            onChange={(event) => { setClienteId(event.target.value); setPage(1); }}
          >
            <option value="">{t('pedido.allCustomers')}</option>
            {clientes?.items.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={status}
            onChange={(event) => { setStatus(event.target.value); setPage(1); }}
          >
            <option value="">{t('pedido.allStatuses')}</option>
            {STATUS_VALUES.map((statusValue) => (
              <option key={statusValue} value={statusValue}>{t(`pedido.status.${statusValue}`)}</option>
            ))}
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
                    <th className="px-4 py-3 text-left">{t('pedido.table.number')}</th>
                    <th className="px-4 py-3 text-left">{t('pedido.table.customer')}</th>
                    <th className="px-4 py-3 text-center">{t('common.fields.status')}</th>
                    <th className="px-4 py-3 text-right">{t('pedido.table.totalValue')}</th>
                    <th className="px-4 py-3 text-left">{t('pedido.table.date')}</th>
                    {showVendedor && <th className="px-4 py-3 text-left">{t('pedido.table.seller')}</th>}
                    {user?.is_admin && <th className="px-4 py-3 text-left">{t('common.fields.factory')}</th>}
                    <th className="px-4 py-3 text-center">{t('common.fields.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.items.map((pedido) => {
                    const clienteNome = pedido.nome_cliente || clientes?.items.find((cliente) => cliente.id === pedido.cliente_id)?.nome || '-';
                    return (
                      <tr key={pedido.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-medium">
                          {pedido.numero === 0 ? t('pedido.fields.offPrefix') : `#${pedido.numero}`}
                        </td>
                        <td className="px-4 py-3">{clienteNome}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[pedido.status]}`}>
                            {t(`pedido.status.${pedido.status}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(pedido.valor_total)}</td>
                        <td className="px-4 py-3">{formatDate(pedido.created_at)}</td>
                        {showVendedor && <td className="px-4 py-3 text-gray-600">{pedido.user_nome ?? '-'}</td>}
                        {user?.is_admin && <td className="px-4 py-3 text-gray-600">{activeFabrica?.nome ?? '-'}</td>}
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <Link
                              to={`/fabrica/pedidos/${pedido.id}`}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Eye size={16} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={6 + (showVendedor ? 1 : 0) + (user?.is_admin ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">
                        {t('pedido.empty')}
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
    </div>
  );
}
