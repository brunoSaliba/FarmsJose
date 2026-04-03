import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { emailApi } from '@/lib/fabrica-api';
import { formatDate } from '@/lib/utils';

export default function EmailConsolidadoPage() {
  const { t } = useTranslation();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [page, setPage] = useState(1);

  const enviarMutation = useMutation({
    mutationFn: () => emailApi.relatorio({ data_inicio: dataInicio, data_fim: dataFim }),
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['fab-email-logs', page],
    queryFn: () => emailApi.logs({ page, limit: 20 }),
  });

  const inputClass = 'rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">{t('emailConsolidado.title')}</h1>

      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">{t('emailConsolidado.sendTitle')}</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('emailConsolidado.fields.startDate')}</label>
            <input type="date" className={inputClass} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('emailConsolidado.fields.endDate')}</label>
            <input type="date" className={inputClass} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <button
            onClick={() => enviarMutation.mutate()}
            disabled={!dataInicio || !dataFim || enviarMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Send size={18} />
            {t('emailConsolidado.actions.sendReport')}
          </button>
        </div>

        {enviarMutation.isSuccess && (
          <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {t('emailConsolidado.sendSuccess')}
          </div>
        )}

        {enviarMutation.isError && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(enviarMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
              t('emailConsolidado.sendError')}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white shadow">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold text-gray-800">{t('emailConsolidado.historyTitle')}</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">{t('common.fields.type')}</th>
                    <th className="px-4 py-3 text-left">{t('emailConsolidado.table.recipient')}</th>
                    <th className="px-4 py-3 text-left">{t('common.fields.subject')}</th>
                    <th className="px-4 py-3 text-center">{t('common.fields.status')}</th>
                    <th className="px-4 py-3 text-left">{t('common.fields.date')}</th>
                    <th className="px-4 py-3 text-left">{t('common.fields.error')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs?.items.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            log.tipo === 'confirmacao' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {t(`emailConsolidado.types.${log.tipo}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.destinatario}</td>
                      <td className="px-4 py-3">{log.assunto}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            log.status === 'enviado'
                              ? 'bg-green-100 text-green-700'
                              : log.status === 'falha'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {t(`dashboardFabrica.emailStatus.${log.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-red-600">{log.erro || '-'}</td>
                    </tr>
                  ))}
                  {logs?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        {t('emailConsolidado.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {logs && logs.pages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <span className="text-sm text-gray-600">
                  {t('common.pagination.summary', { count: logs.total, page: logs.page, pages: logs.pages })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    {t('common.actions.previous')}
                  </button>
                  <button
                    onClick={() => setPage((current) => current + 1)}
                    disabled={page >= logs.pages}
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
