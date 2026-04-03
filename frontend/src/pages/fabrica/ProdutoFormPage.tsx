import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft } from 'lucide-react';
import { offlineProdutoApi } from '@/lib/fabrica-offline';

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatorio'),
  descricao: z.string().optional(),
  sku: z.string().optional(),
  unidade: z.string().min(1, 'Unidade obrigatoria'),
  preco: z.string().min(1, 'Preco obrigatorio').refine(
    (val) => !isNaN(Number(val.replace(',', '.'))) && Number(val.replace(',', '.')) >= 0,
    { message: 'Preco deve ser um valor valido' }
  ),
  ativo: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function ProdutoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const { data: produto } = useQuery({
    queryKey: ['fab-produto', id],
    queryFn: () => offlineProdutoApi.get(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      unidade: 'un',
      preco: '',
      sku: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (produto) {
      reset({
        nome: produto.nome,
        descricao: produto.descricao || '',
        sku: produto.sku || '',
        unidade: produto.unidade,
        preco: String(produto.preco).replace('.', ','),
        ativo: produto.ativo,
      });
    }
  }, [produto, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        nome: data.nome,
        descricao: data.descricao || null,
        sku: data.sku || null,
        unidade: data.unidade,
        preco: Number(data.preco.replace(',', '.')),
        ...(isEdit ? { ativo: data.ativo } : {}),
      };
      return isEdit ? offlineProdutoApi.update(id!, payload) : offlineProdutoApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fab-produtos'] });
      navigate('/fabrica/produtos');
    },
  });

  const inputClass = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEdit ? 'Editar Produto' : 'Novo Produto'}
        </h1>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className={labelClass}>Nome *</label>
            <input {...register('nome')} className={inputClass} />
            {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
          </div>
          <div>
            <label className={labelClass}>SKU</label>
            <input {...register('sku')} className={inputClass} placeholder="Codigo do produto" />
          </div>
          <div>
            <label className={labelClass}>Unidade *</label>
            <select {...register('unidade')} className={inputClass}>
              <option value="un">Unidade (un)</option>
              <option value="kg">Quilograma (kg)</option>
              <option value="g">Grama (g)</option>
              <option value="l">Litro (l)</option>
              <option value="ml">Mililitro (ml)</option>
              <option value="m">Metro (m)</option>
              <option value="cx">Caixa (cx)</option>
              <option value="pc">Peca (pc)</option>
              <option value="pct">Pacote (pct)</option>
              <option value="sc">Saco (sc)</option>
            </select>
            {errors.unidade && <p className="text-red-500 text-xs mt-1">{errors.unidade.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Preco (R$) *</label>
            <input
              {...register('preco')}
              className={inputClass}
              placeholder="0,00"
              inputMode="decimal"
            />
            {errors.preco && <p className="text-red-500 text-xs mt-1">{errors.preco.message}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>Descricao</label>
          <textarea {...register('descricao')} rows={3} className={inputClass} />
        </div>

        {isEdit && (
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              {...register('ativo')}
              id="ativo-check"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="ativo-check" className="text-sm font-medium text-gray-700">Ativo</label>
          </div>
        )}

        {mutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {(mutation.error as any)?.response?.data?.detail || 'Erro ao salvar'}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save size={18} />
            {isEdit ? 'Atualizar' : 'Cadastrar'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/fabrica/produtos')}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
