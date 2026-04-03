import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, XCircle, Copy, Mail, Pencil } from 'lucide-react';
import { pedidoApi, emailApi } from '@/lib/fabrica-api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { StatusPedido } from '@/types/fabrica';

const STATUS_BADGE: Record<StatusPedido, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  confirmado: 'bg-blue-100 text-blue-700',
  enviado: 'bg-green-100 text-green-700',
  em_processamento: 'bg-yellow-100 text-yellow-700',
  finalizado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<StatusPedido, string> = {
  rascunho: 'Rascunho',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  em_processamento: 'Em Processamento',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export default function PedidoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['fab-pedido', id],
    queryFn: () => pedidoApi.get(id!),
    enabled: Boolean(id),
  });

  const confirmarMutation = useMutation({
    mutationFn: () => pedidoApi.confirmar(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fab-pedido', id] }),
  });

  const cancelarMutation = useMutation({
    mutationFn: () => pedidoApi.cancelar(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fab-pedido', id] }),
  });

  const duplicarMutation = useMutation({
    mutationFn: () => pedidoApi.duplicar(id!),
    onSuccess: (newPedido) => {
      queryClient.invalidateQueries({ queryKey: ['fab-pedidos'] });
      navigate(`/fabrica/pedidos/${newPedido.id}`);
    },
  });

  const enviarEmailMutation = useMutation({
    mutationFn: () => emailApi.confirmarPedido(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fab-pedido', id] }),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  }

  if (!pedido) {
    return <div className="p-8 text-center text-gray-500">Pedido nao encontrado</div>;
  }

  const canConfirm = pedido.status === 'rascunho';
  const canCancel = pedido.status === 'rascunho' || pedido.status === 'confirmado';
  const canEdit = pedido.status === 'rascunho';
  const canSendEmail = pedido.status === 'confirmado' || pedido.status === 'enviado';

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/fabrica/pedidos')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">
            Pedido #{pedido.numero}
          </h1>
          <p className="text-sm text-gray-500">Criado em {formatDate(pedido.created_at)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[pedido.status]}`}>
          {STATUS_LABEL[pedido.status]}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {canEdit && (
          <button
            onClick={() => navigate(`/fabrica/pedidos/${pedido.id}/editar`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Pencil size={16} />
            Editar
          </button>
        )}
        {canConfirm && (
          <button
            onClick={() => confirmarMutation.mutate()}
            disabled={confirmarMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
          >
            <CheckCircle size={16} />
            Confirmar
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => {
              if (window.confirm('Deseja cancelar este pedido?')) cancelarMutation.mutate();
            }}
            disabled={cancelarMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
          >
            <XCircle size={16} />
            Cancelar Pedido
          </button>
        )}
        <button
          onClick={() => duplicarMutation.mutate()}
          disabled={duplicarMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
        >
          <Copy size={16} />
          Duplicar
        </button>
        {canSendEmail && (
          <button
            onClick={() => enviarEmailMutation.mutate()}
            disabled={enviarEmailMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm disabled:opacity-50"
          >
            <Mail size={16} />
            Enviar Email
          </button>
        )}
      </div>

      {/* Mutation errors */}
      {(confirmarMutation.isError || cancelarMutation.isError || duplicarMutation.isError || enviarEmailMutation.isError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {((confirmarMutation.error || cancelarMutation.error || duplicarMutation.error || enviarEmailMutation.error) as any)?.response?.data?.detail || 'Erro na operacao'}
        </div>
      )}

      {enviarEmailMutation.isSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
          Email enviado com sucesso!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Cliente</h2>
          {pedido.cliente ? (
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500">Nome</dt><dd className="font-medium">{pedido.cliente.nome}</dd></div>
              <div><dt className="text-gray-500">Email</dt><dd>{pedido.cliente.email}</dd></div>
              <div><dt className="text-gray-500">Telefone</dt><dd>{pedido.cliente.telefone}</dd></div>
              {pedido.cliente.cidade && (
                <div><dt className="text-gray-500">Cidade</dt><dd>{pedido.cliente.cidade}/{pedido.cliente.estado}</dd></div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Cliente nao encontrado</p>
          )}
        </div>

        {/* Items */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Itens</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-2 text-left">Descricao</th>
                <th className="px-4 py-2 text-right">Qtd</th>
                <th className="px-4 py-2 text-right">Valor Unit.</th>
                <th className="px-4 py-2 text-right">Desc.</th>
                <th className="px-4 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pedido.itens.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">{item.descricao}</td>
                  <td className="px-4 py-2 text-right">{item.quantidade}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.valor_unitario)}</td>
                  <td className="px-4 py-2 text-right">{item.desconto > 0 ? `${item.desconto}%` : '-'}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.valor_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {pedido.desconto > 0 && (
                <>
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">Subtotal</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(pedido.subtotal)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">Desconto</td>
                    <td className="px-4 py-2 text-right text-red-600">-{pedido.desconto}%</td>
                  </tr>
                </>
              )}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={4} className="px-4 py-3 text-right">Total</td>
                <td className="px-4 py-3 text-right text-primary-700">{formatCurrency(pedido.valor_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {pedido.observacoes && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Observacoes</h2>
          <p className="text-sm text-gray-600">{pedido.observacoes}</p>
        </div>
      )}
    </div>
  );
}
