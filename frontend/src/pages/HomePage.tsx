import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { PiCow, PiFarm } from 'react-icons/pi';
import { offlineFazendaApi as fazendaApi } from '@/lib/offline-api';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();
  const { data: fazendas, isLoading } = useQuery({
    queryKey: ['fazendas-resumo'],
    queryFn: fazendaApi.resumoGeral,
  });

  const totalAnimais = fazendas?.reduce((s, f) => s + f.total_animais, 0) ?? 0;
  const totalLotes = fazendas?.reduce((s, f) => s + f.total_lotes, 0) ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('home.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5 flex items-center gap-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <PiFarm className="text-primary-700" size={24} />
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">{t('home.cards.farms')}</div>
            <div className="text-2xl font-bold text-gray-800">{fazendas?.length ?? 0}</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-5 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <PiCow className="text-green-700" size={24} />
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">{t('home.cards.animals')}</div>
            <div className="text-2xl font-bold text-gray-800">{totalAnimais}</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-lg">
            <Layers className="text-amber-700" size={24} />
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">{t('home.cards.lots')}</div>
            <div className="text-2xl font-bold text-gray-800">{totalLotes}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">{t('home.summaryTitle')}</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">{t('home.table.farm')}</th>
                  <th className="px-6 py-3 text-left">{t('home.table.cityState')}</th>
                  <th className="px-6 py-3 text-right">{t('home.table.lots')}</th>
                  <th className="px-6 py-3 text-right">{t('home.table.animals')}</th>
                  <th className="px-6 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fazendas?.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{f.nome_fantasia}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {f.cidade ? `${f.cidade}/${f.estado}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">{f.total_lotes}</td>
                    <td className="px-6 py-4 text-right">{f.total_animais}</td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        to={`/resumo?fazenda=${f.id}`}
                        className="text-primary-600 hover:underline text-sm"
                      >
                        {t('home.viewDetails')}
                      </Link>
                    </td>
                  </tr>
                ))}
                {fazendas?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {t('home.noFarms')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
