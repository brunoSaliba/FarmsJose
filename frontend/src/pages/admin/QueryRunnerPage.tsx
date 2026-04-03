import { useRef, useState, type KeyboardEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Play, X, AlertCircle, Info, Download } from 'lucide-react';
import { adminApi, type QueryResult } from '@/lib/api';

const QUERY_GROUPS = [
  {
    labelKey: 'adminQuery.groups.system',
    color: 'gray',
    queries: [
      {
        labelKey: 'adminQuery.queries.users',
        sql: 'SELECT id, nome, email, is_admin, is_active, modulos, created_at FROM "user" ORDER BY created_at DESC',
      },
      {
        labelKey: 'adminQuery.queries.tables',
        sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      },
      {
        labelKey: 'adminQuery.queries.migrations',
        sql: 'SELECT version_num FROM alembic_version',
      },
    ],
  },
  {
    labelKey: 'adminQuery.groups.module1',
    color: 'green',
    queries: [
      {
        labelKey: 'adminQuery.queries.farms',
        sql: 'SELECT id_sistema, nome_fantasia, cnpj, estado, cidade, ativo, created_at FROM fazenda ORDER BY id_sistema',
      },
      {
        labelKey: 'adminQuery.queries.animals',
        sql: 'SELECT a.codigo_identificacao, a.nome, a.sexo, a.raca, f.nome_fantasia AS fazenda, a.created_at FROM animal a JOIN fazenda f ON f.id = a.fazenda_id ORDER BY a.created_at DESC LIMIT 50',
      },
      {
        labelKey: 'adminQuery.queries.sanitaryHistory',
        sql: 'SELECT h.vacina, h.data_aplicacao, h.observacao, a.codigo_identificacao AS animal FROM historico_sanitario h JOIN animal a ON a.id = h.animal_id ORDER BY h.data_aplicacao DESC LIMIT 50',
      },
      {
        labelKey: 'adminQuery.queries.costs',
        sql: 'SELECT c.custo_total_lote, c.custo_mensal, c.custo_diario, c.custo_total_animal, c.preco_venda, f.nome_fantasia AS fazenda FROM custo_fazenda c JOIN fazenda f ON f.id = c.fazenda_id ORDER BY f.nome_fantasia',
      },
    ],
  },
  {
    labelKey: 'adminQuery.groups.module2',
    color: 'blue',
    queries: [
      {
        labelKey: 'adminQuery.queries.factories',
        sql: 'SELECT id, nome, cnpj, cidade, estado, ativo, created_at FROM fabrica_unidade ORDER BY nome',
      },
      {
        labelKey: 'adminQuery.queries.factoryUsers',
        sql: 'SELECT u.nome, u.email, fu.papel, fu.ativo, f.nome AS fabrica FROM fabrica_usuario fu JOIN "user" u ON u.id = fu.user_id JOIN fabrica_unidade f ON f.id = fu.fabrica_id ORDER BY f.nome, u.nome',
      },
      {
        labelKey: 'adminQuery.queries.clients',
        sql: 'SELECT nome, email, telefone, cidade, estado, ativo, created_at FROM cliente ORDER BY nome LIMIT 50',
      },
      {
        labelKey: 'adminQuery.queries.products',
        sql: 'SELECT p.nome, p.sku, p.unidade, p.preco, p.ativo, f.nome AS fabrica FROM produto p LEFT JOIN fabrica_unidade f ON f.id = p.fabrica_id WHERE p.deletado = false ORDER BY p.nome LIMIT 50',
      },
      {
        labelKey: 'adminQuery.queries.orders',
        sql: 'SELECT p.numero, c.nome AS cliente, p.status, p.subtotal, p.desconto, p.valor_total, p.created_at FROM pedido p JOIN cliente c ON c.id = p.cliente_id ORDER BY p.created_at DESC LIMIT 50',
      },
      {
        labelKey: 'adminQuery.queries.orderItems',
        sql: 'SELECT p.numero AS pedido, i.descricao AS produto, i.quantidade, i.valor_unitario, i.desconto, i.valor_total FROM item_pedido i JOIN pedido p ON p.id = i.pedido_id ORDER BY p.numero DESC LIMIT 50',
      },
      {
        labelKey: 'adminQuery.queries.emailLogs',
        sql: 'SELECT el.destinatario, el.assunto, el.tipo, el.status, el.erro, f.nome AS fabrica, el.created_at FROM email_log el JOIN fabrica_unidade f ON f.id = el.fabrica_id ORDER BY el.created_at DESC LIMIT 50',
      },
      {
        labelKey: 'adminQuery.queries.settings',
        sql: 'SELECT c.chave, c.valor, f.nome AS fabrica, c.updated_at FROM configuracao c JOIN fabrica_unidade f ON f.id = c.fabrica_id ORDER BY f.nome, c.chave',
      },
    ],
  },
] as const;

function ResultModal({ result, onClose }: { result: QueryResult; onClose: () => void }) {
  const { t } = useTranslation();

  function downloadCsv() {
    const header = result.columns.join(',');
    const rows = result.rows.map((row) =>
      row.map((value) => (value === null ? '' : `"${String(value).replace(/"/g, '""')}"`)).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'query_result.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-800">{t('adminQuery.result')}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {t('adminQuery.rows', { count: result.row_count })}
            </span>
            {result.truncated && (
              <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                <Info size={11} />
                {t('adminQuery.truncated')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCsv}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Download size={13} />
              {t('adminQuery.downloadCsv')}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {result.columns.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">
              {t('adminQuery.emptyResult')}
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="w-10 border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-400">
                    #
                  </th>
                  {result.columns.map((column) => (
                    <th
                      key={column}
                      className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="select-none px-3 py-1.5 text-xs text-gray-400">{rowIndex + 1}</td>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={`max-w-xs truncate px-3 py-1.5 font-mono text-xs ${
                          cell === null ? 'italic text-gray-300' : 'text-gray-800'
                        }`}
                        title={cell === null ? t('adminQuery.nullValue') : String(cell)}
                      >
                        {cell === null ? t('adminQuery.nullValue') : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QueryRunnerPage() {
  const { t } = useTranslation();
  const [sql, setSql] = useState('SELECT * FROM "user" LIMIT 10');
  const [result, setResult] = useState<QueryResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useMutation({
    mutationFn: () => adminApi.runQuery(sql),
    onSuccess: (data) => setResult(data),
  });

  function handleRun() {
    mutation.reset();
    mutation.mutate();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleRun();
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const { selectionStart, selectionEnd } = event.currentTarget;
      const nextValue = sql.substring(0, selectionStart) + '  ' + sql.substring(selectionEnd);
      setSql(nextValue);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = selectionStart + 2;
          textareaRef.current.selectionEnd = selectionStart + 2;
        }
      });
    }
  }

  const errorMessage = mutation.error
    ? (mutation.error as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
      t('adminQuery.unknownError')
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{t('adminQuery.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('adminQuery.subtitle')}</p>
      </div>

      <div className="space-y-2">
        {QUERY_GROUPS.map((group) => (
          <div key={group.labelKey} className="flex flex-wrap items-center gap-2">
            <span className="w-full text-xs font-semibold uppercase tracking-wide text-gray-400 sm:mr-1 sm:w-auto">
              {t(group.labelKey)}
            </span>
            {group.queries.map(({ labelKey, sql: querySql }) => (
              <button
                key={labelKey}
                onClick={() => setSql(querySql)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  group.color === 'green'
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : group.color === 'blue'
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">SQL</span>
          <span className="text-xs text-gray-400">{t('adminQuery.ctrlEnter')}</span>
        </div>
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(event) => setSql(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={10}
          spellCheck={false}
          className="w-full resize-y px-4 py-3 font-mono text-sm text-gray-800 focus:outline-none"
          placeholder={t('adminQuery.placeholder')}
        />
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <pre className="whitespace-pre-wrap font-mono text-xs">{errorMessage}</pre>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleRun}
          disabled={mutation.isPending || !sql.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={15} className={mutation.isPending ? 'animate-pulse' : ''} />
          {mutation.isPending ? t('adminQuery.running') : t('common.actions.run')}
        </button>
      </div>

      {result && <ResultModal result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
