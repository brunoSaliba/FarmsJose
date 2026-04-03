import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { offlineFazendaApi as fazendaApi } from '@/lib/offline-api';
import { formatDate, maskCnpj } from '@/lib/utils';
import type { Fazenda } from '@/types';

interface ConfirmDeleteModalProps {
  items: Fazenda[];
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function ConfirmDeleteModal({ items, onConfirm, onCancel, isDeleting }: ConfirmDeleteModalProps) {
  const { t } = useTranslation();
  const single = items.length === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h2 className="font-semibold text-gray-800">{t('fazendas.confirm.title')}</h2>
          </div>
          <button onClick={onCancel} className="rounded p-1 hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4">
          {single ? (
            <p className="text-sm text-gray-600">{t('fazendas.confirm.single', { name: items[0].nome_fantasia })}</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-gray-600">{t('fazendas.confirm.multiple', { count: items.length })}</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                {items.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <span className="font-mono text-gray-400">#{f.id_sistema}</span>
                    {f.nome_fantasia}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-5">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {t('common.actions.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {isDeleting
              ? t('fazendas.confirm.deleting')
              : t(single ? 'fazendas.confirm.delete_one' : 'fazendas.confirm.delete_other', { count: items.length })}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FazendasPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<Fazenda[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['fazendas', search, page],
    queryFn: () => fazendaApi.list({ q: search || undefined, page, limit: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: fazendaApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fazendas'] }),
  });

  const pageIds = data?.items.map((f) => f.id) ?? [];
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...pageIds]));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      for (const f of toDelete) {
        await new Promise<void>((resolve, reject) =>
          deleteMutation.mutate(f.id, { onSuccess: () => resolve(), onError: reject }),
        );
      }
      setSelected((prev) => {
        const next = new Set(prev);
        toDelete.forEach((f) => next.delete(f.id));
        return next;
      });
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{t('fazendas.title')}</h1>
        <Link
          to="/fazendas/novo"
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
        >
          <Plus size={18} />
          {t('fazendas.new')}
        </Link>
      </div>

      <div className="rounded-lg bg-white shadow">
        <div className="flex flex-wrap items-center gap-4 border-b p-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('fazendas.searchPlaceholder')}
              className="w-full rounded-lg border py-2 pr-4 pl-10 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {someSelected && (
            <button
              onClick={() => setToDelete((data?.items ?? []).filter((f) => selected.has(f.id)))}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
            >
              <Trash2 size={15} />
              {t('fazendas.deleteSelected', { count: selected.size })}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = !allPageSelected && pageIds.some((id) => selected.has(id));
                        }}
                        onChange={toggleAll}
                        className="cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">{t('fazendas.table.id')}</th>
                    <th className="px-4 py-3 text-left">{t('fazendas.table.tradeName')}</th>
                    <th className="px-4 py-3 text-left">CNPJ</th>
                    <th className="px-4 py-3 text-left">{t('fazendas.table.cityState')}</th>
                    <th className="px-4 py-3 text-left">{t('fazendas.table.phone')}</th>
                    <th className="px-4 py-3 text-left">{t('fazendas.table.dateAdded')}</th>
                    <th className="px-4 py-3 text-center">{t('common.fields.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.items.map((f) => (
                    <tr key={f.id} className={`hover:bg-gray-50 ${selected.has(f.id) ? 'bg-primary-50' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(f.id)}
                          onChange={() => toggleOne(f.id)}
                          className="cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono">{f.id_sistema}</td>
                      <td className="px-4 py-3 font-medium">{f.nome_fantasia}</td>
                      <td className="px-4 py-3">{f.cnpj ? maskCnpj(f.cnpj) : '-'}</td>
                      <td className="px-4 py-3">{f.cidade ? `${f.cidade}/${f.estado}` : '-'}</td>
                      <td className="px-4 py-3">{f.telefone || f.celular || '-'}</td>
                      <td className="px-4 py-3">{formatDate(f.data_cadastro)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Link to={`/fazendas/${f.id}/editar`} className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                            <Pencil size={16} />
                          </Link>
                          <button onClick={() => setToDelete([f])} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        {t('fazendas.empty')}
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

      {deleteMutation.isError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {(deleteMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            t('fazendas.deleteError')}
        </div>
      )}

      {toDelete && (
        <ConfirmDeleteModal
          items={toDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setToDelete(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
