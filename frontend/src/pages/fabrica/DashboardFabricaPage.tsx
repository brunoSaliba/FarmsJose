import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Users, ShoppingCart, Mail, Package, Building2 } from 'lucide-react';
import { offlineClienteApi, offlinePedidoApi, offlineProdutoApi, offlineFabricaApi } from '@/lib/fabrica-offline';
import { emailApi } from '@/lib/fabrica-api';
import type { StatusPedido } from '@/types/fabrica';

export default function DashboardFabricaPage() {
  const { t } = useTranslation();

  const statusConfig: Record<StatusPedido, { label: string; color: string }> = {
    rascunho: { label: t('dashboardFabrica.status.rascunho'), color: 'bg-gray-100 text-gray-700' },
    confirmado: { label: t('dashboardFabrica.status.confirmado'), color: 'bg-blue-100 text-blue-700' },
    enviado: { label: t('dashboardFabrica.status.enviado'), color: 'bg-green-100 text-green-700' },
    em_processamento: {
      label: t('dashboardFabrica.status.em_processamento'),
      color: 'bg-yellow-100 text-yellow-700',
    },
    finalizado: { label: t('dashboardFabrica.status.finalizado'), color: 'bg-emerald-100 text-emerald-700' },
    cancelado: { label: t('dashboardFabrica.status.cancelado'), color: 'bg-red-100 text-red-700' },
  };

  const { data: clientes } = useQuery({
    queryKey: ['fab-clientes-dash'],
    queryFn: () => offlineClienteApi.list({ limit: 1 }),
  });

  const { data: clientesAtivos } = useQuery({
    queryKey: ['fab-clientes-dash-ativos'],
    queryFn: () => offlineClienteApi.list({ ativo: true, limit: 1 }),
  });

  const { data: pedidos } = useQuery({
    queryKey: ['fab-pedidos-dash'],
    queryFn: () => offlinePedidoApi.list({ limit: 1 }),
  });

  const { data: pedidosRascunho } = useQuery({
    queryKey: ['fab-pedidos-dash', 'rascunho'],
    queryFn: () => offlinePedidoApi.list({ status: 'rascunho', limit: 1 }),
  });

  const { data: pedidosConfirmado } = useQuery({
    queryKey: ['fab-pedidos-dash', 'confirmado'],
    queryFn: () => offlinePedidoApi.list({ status: 'confirmado', limit: 1 }),
  });

  const { data: pedidosEnviado } = useQuery({
    queryKey: ['fab-pedidos-dash', 'enviado'],
    queryFn: () => offlinePedidoApi.list({ status: 'enviado', limit: 1 }),
  });

  const { data: produtos } = useQuery({
    queryKey: ['fab-produtos-dash'],
    queryFn: () => offlineProdutoApi.list({ limit: 1 }),
  });

  const { data: fabricas } = useQuery({
    queryKey: ['fab-fabricas-dash'],
    queryFn: () => offlineFabricaApi.list({ limit: 1 }),
  });

  const { data: pedidosEmProcessamento } = useQuery({
    queryKey: ['fab-pedidos-dash', 'em_processamento'],
    queryFn: () => offlinePedidoApi.list({ status: 'em_processamento', limit: 1 }),
  });

  const { data: pedidosFinalizado } = useQuery({
    queryKey: ['fab-pedidos-dash', 'finalizado'],
    queryFn: () => offlinePedidoApi.list({ status: 'finalizado', limit: 1 }),
  });

  const { data: emailLogs } = useQuery({
    queryKey: ['fab-email-logs-dash'],
    queryFn: () => emailApi.logs({ limit: 5 }),
  });

  const cards = [
    {
      label: t('dashboardFabrica.cards.totalClients'),
      value: clientes?.total ?? 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: t('dashboardFabrica.cards.activeClients'),
      value: clientesAtivos?.total ?? 0,
      icon: Users,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: t('dashboardFabrica.cards.totalOrders'),
      value: pedidos?.total ?? 0,
      icon: ShoppingCart,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: t('dashboardFabrica.cards.products'),
      value: produtos?.total ?? 0,
      icon: Package,
      color: 'text-teal-600 bg-teal-50',
    },
    {
      label: t('dashboardFabrica.cards.factories'),
      value: fabricas?.total ?? 0,
      icon: Building2,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: t('dashboardFabrica.cards.emailsSent'),
      value: emailLogs?.total ?? 0,
      icon: Mail,
      color: 'text-orange-600 bg-orange-50',
    },
  ];

  const getStatusCount = (status: StatusPedido) => {
    if (status === 'rascunho') return pedidosRascunho?.total ?? 0;
    if (status === 'confirmado') return pedidosConfirmado?.total ?? 0;
    if (status === 'enviado') return pedidosEnviado?.total ?? 0;
    if (status === 'em_processamento') return pedidosEmProcessamento?.total ?? 0;
    if (status === 'finalizado') return pedidosFinalizado?.total ?? 0;
    return 0;
  };

  const getEmailStatusLabel = (status: string) =>
    t(`dashboardFabrica.emailStatus.${status}`, { defaultValue: status });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">{t('dashboardFabrica.title')}</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
              </div>
              <div className={`rounded-full p-3 ${color}`}>
                <Icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">{t('dashboardFabrica.ordersByStatus')}</h2>
          <div className="space-y-3">
            {(Object.keys(statusConfig) as StatusPedido[]).map((status) => (
              <div key={status} className="flex items-center justify-between border-b py-2 last:border-0">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusConfig[status].color}`}>
                  {statusConfig[status].label}
                </span>
                <span className="text-lg font-bold text-gray-700">{getStatusCount(status)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">{t('dashboardFabrica.latestEmails')}</h2>
          {emailLogs?.items.length ? (
            <div className="space-y-3">
              {emailLogs.items.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{log.assunto}</p>
                    <p className="text-xs text-gray-500">{log.destinatario}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      log.status === 'enviado'
                        ? 'bg-green-100 text-green-700'
                        : log.status === 'falha'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {getEmailStatusLabel(log.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('dashboardFabrica.noEmails')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
