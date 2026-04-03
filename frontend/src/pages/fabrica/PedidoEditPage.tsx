import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { offlineClienteApi, offlinePedidoApi, offlineProdutoApi } from '@/lib/fabrica-offline';
import { formatCurrency } from '@/lib/utils';

const itemSchema = z.object({
  produto_id: z.string().optional(),
  descricao: z.string().min(1, 'Descricao obrigatoria'),
  quantidade: z.coerce.number().min(1, 'Minimo 1'),
  valor_unitario: z.coerce.number().min(0.01, 'Valor obrigatorio'),
  desconto: z.coerce.number().min(0).max(100).default(0),
});

const schema = z.object({
  observacoes: z.string().optional(),
  desconto: z.coerce.number().min(0).max(100).default(0),
  itens: z.array(itemSchema).min(1, 'Adicione ao menos 1 item'),
});

type FormData = z.infer<typeof schema>;

export default function PedidoEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pedido } = useQuery({
    queryKey: ['fab-pedido', id],
    queryFn: () => offlinePedidoApi.get(id!),
    enabled: Boolean(id),
  });

  const { data: clientes } = useQuery({
    queryKey: ['fab-clientes-select'],
    queryFn: () => offlineClienteApi.list({ ativo: true, limit: 200 }),
  });

  const { data: produtos } = useQuery({
    queryKey: ['fab-produtos-select'],
    queryFn: () => offlineProdutoApi.list({ ativo: true, limit: 500 }),
  });

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      observacoes: '',
      desconto: 0,
      itens: [{ produto_id: '', descricao: '', quantidade: 1, valor_unitario: 0, desconto: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });
  const watchItens = watch('itens');
  const watchDesconto = Number(watch('desconto')) || 0;

  useEffect(() => {
    if (pedido) {
      reset({
        observacoes: pedido.observacoes || '',
        desconto: pedido.desconto || 0,
        itens: pedido.itens.map(i => ({
          produto_id: i.produto_id || '',
          descricao: i.descricao,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
          desconto: i.desconto || 0,
        })),
      });
    }
  }, [pedido, reset]);

  const subtotal = watchItens.reduce((sum, item) => {
    const qty = Number(item.quantidade) || 0;
    const price = Number(item.valor_unitario) || 0;
    const disc = Number(item.desconto) || 0;
    return sum + qty * price * (1 - disc / 100);
  }, 0);

  const valorTotal = subtotal * (1 - watchDesconto / 100);

  const handleProductSelect = (index: number, produtoId: string) => {
    if (!produtoId) return;
    const produto = produtos?.items.find(p => p.id === produtoId);
    if (produto) {
      setValue(`itens.${index}.descricao`, produto.nome);
      setValue(`itens.${index}.valor_unitario`, produto.preco);
      setValue(`itens.${index}.produto_id`, produto.id);
    }
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      return offlinePedidoApi.update(id!, {
        observacoes: data.observacoes || null,
        desconto: Number(data.desconto) || 0,
        itens: data.itens.map(i => ({
          produto_id: i.produto_id || null,
          descricao: i.descricao,
          quantidade: Number(i.quantidade),
          valor_unitario: Number(i.valor_unitario),
          desconto: Number(i.desconto) || 0,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fab-pedido', id] });
      queryClient.invalidateQueries({ queryKey: ['fab-pedidos'] });
      navigate(`/fabrica/pedidos/${id}`);
    },
  });

  const clienteNome = pedido?.nome_cliente || (pedido && clientes
    ? clientes.items.find(c => c.id === pedido.cliente_id)?.nome ?? '-'
    : '-');

  const inputClass = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          Editar Pedido #{pedido?.numero ?? ''}
        </h1>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Cliente</label>
              <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm">{clienteNome}</div>
            </div>
            <div>
              <label className={labelClass}>Desconto Geral (%)</label>
              <input {...register('desconto')} type="number" min={0} max={100} step="0.01" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Observacoes</label>
              <input {...register('observacoes')} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Itens do Pedido</h2>
            <button
              type="button"
              onClick={() => append({ produto_id: '', descricao: '', quantidade: 1, valor_unitario: 0, desconto: 0 })}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus size={16} />
              Adicionar Item
            </button>
          </div>

          {errors.itens?.root && (
            <p className="text-red-500 text-xs mb-3">{errors.itens.root.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => {
              const qty = Number(watchItens[index]?.quantidade) || 0;
              const price = Number(watchItens[index]?.valor_unitario) || 0;
              const disc = Number(watchItens[index]?.desconto) || 0;
              const itemSubtotal = qty * price * (1 - disc / 100);

              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-3">
                    {index === 0 && <label className="text-xs text-gray-500 mb-1 block">Produto</label>}
                    <select
                      className={inputClass}
                      value={watchItens[index]?.produto_id || ''}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                    >
                      <option value="">Manual</option>
                      {produtos?.items.map(p => (
                        <option key={p.id} value={p.id}>{p.nome} - {formatCurrency(p.preco)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    {index === 0 && <label className="text-xs text-gray-500 mb-1 block">Descricao</label>}
                    <input
                      {...register(`itens.${index}.descricao`)}
                      className={inputClass}
                      placeholder="Descricao do item"
                    />
                    {errors.itens?.[index]?.descricao && (
                      <p className="text-red-500 text-xs mt-1">{errors.itens[index]?.descricao?.message}</p>
                    )}
                  </div>
                  <div className="col-span-1">
                    {index === 0 && <label className="text-xs text-gray-500 mb-1 block">Qtd</label>}
                    <input
                      {...register(`itens.${index}.quantidade`)}
                      type="number"
                      min={1}
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="text-xs text-gray-500 mb-1 block">V. Unit.</label>}
                    <input
                      {...register(`itens.${index}.valor_unitario`)}
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-1">
                    {index === 0 && <label className="text-xs text-gray-500 mb-1 block">Desc%</label>}
                    <input
                      {...register(`itens.${index}.desconto`)}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-1">
                    {index === 0 && <label className="text-xs text-gray-500 mb-1 block">Subtotal</label>}
                    <div className="px-2 py-2 bg-gray-50 border rounded-lg text-sm text-right">
                      {formatCurrency(itemSubtotal)}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end">
                    {index === 0 && <label className="text-xs text-transparent mb-1 block">.</label>}
                    <button
                      type="button"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1}
                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t flex justify-end">
            <div className="text-right space-y-1">
              {watchDesconto > 0 && (
                <>
                  <div>
                    <span className="text-sm text-gray-500">Subtotal:</span>
                    <span className="ml-2 text-sm">{formatCurrency(subtotal)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Desconto:</span>
                    <span className="ml-2 text-sm text-red-600">-{watchDesconto}%</span>
                  </div>
                </>
              )}
              <div>
                <span className="text-sm text-gray-500">Total:</span>
                <span className="ml-2 text-xl font-bold text-primary-700">{formatCurrency(valorTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {mutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {(mutation.error as any)?.response?.data?.detail || 'Erro ao salvar'}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save size={18} />
            Atualizar Pedido
          </button>
          <button
            type="button"
            onClick={() => navigate(`/fabrica/pedidos/${id}`)}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
