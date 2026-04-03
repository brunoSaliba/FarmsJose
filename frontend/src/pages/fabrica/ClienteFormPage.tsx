import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Search } from 'lucide-react';
import { offlineClienteApi } from '@/lib/fabrica-offline';
import { maskPhone, maskCep, maskCpf, maskCnpj, unmask } from '@/lib/utils';
import { lookupCep } from '@/lib/cep';

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatorio'),
  email: z.string().email('Email invalido'),
  telefone: z.string().min(1, 'Telefone obrigatorio'),
  cpf_cnpj: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function ClienteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const { data: cliente } = useQuery({
    queryKey: ['fab-cliente', id],
    queryFn: () => offlineClienteApi.get(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ativo: true },
  });

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  async function handleCepLookup() {
    const raw = watch('cep') ?? '';
    setCepError(null);
    setCepLoading(true);
    try {
      const result = await lookupCep(raw);
      if (result.logradouro) setValue('endereco', result.logradouro);
      if (result.localidade) setValue('cidade', result.localidade);
      if (result.uf) setValue('estado', result.uf);
    } catch (e: unknown) {
      setCepError(e instanceof Error ? e.message : 'Erro ao buscar CEP');
    } finally {
      setCepLoading(false);
    }
  }

  useEffect(() => {
    if (cliente) {
      reset({
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone ? maskPhone(cliente.telefone) : '',
        cpf_cnpj: cliente.cpf_cnpj
          ? (cliente.cpf_cnpj.replace(/\D/g, '').length <= 11 ? maskCpf(cliente.cpf_cnpj) : maskCnpj(cliente.cpf_cnpj))
          : '',
        endereco: cliente.endereco || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        cep: cliente.cep ? maskCep(cliente.cep) : '',
        observacoes: cliente.observacoes || '',
        ativo: cliente.ativo,
      });
    }
  }, [cliente, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        telefone: data.telefone ? unmask(data.telefone) : '',
        cpf_cnpj: data.cpf_cnpj ? unmask(data.cpf_cnpj) : null,
        cep: data.cep ? unmask(data.cep) : null,
        endereco: data.endereco || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        observacoes: data.observacoes || null,
        ...(isEdit ? { ativo: data.ativo } : {}),
      };
      return isEdit ? offlineClienteApi.update(id!, payload) : offlineClienteApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fab-clientes'] });
      navigate('/fabrica/clientes');
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
          {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        </h1>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input {...register('nome')} className={inputClass} />
            {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input {...register('email')} type="email" className={inputClass} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Telefone *</label>
            <input
              {...register('telefone')}
              className={inputClass}
              onChange={(e) => setValue('telefone', maskPhone(e.target.value))}
              maxLength={15}
            />
            {errors.telefone && <p className="text-red-500 text-xs mt-1">{errors.telefone.message}</p>}
          </div>
          <div>
            <label className={labelClass}>CPF/CNPJ</label>
            <input
              {...register('cpf_cnpj')}
              className={inputClass}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                setValue('cpf_cnpj', digits.length <= 11 ? maskCpf(e.target.value) : maskCnpj(e.target.value));
              }}
              maxLength={18}
            />
          </div>
          <div className="lg:col-span-2">
            <label className={labelClass}>Endereco</label>
            <input {...register('endereco')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>CEP</label>
            <div className="flex gap-2">
              <input
                {...register('cep')}
                className={inputClass}
                onChange={(e) => { setValue('cep', maskCep(e.target.value)); setCepError(null); }}
                onBlur={() => { if ((watch('cep') ?? '').replace(/\D/g, '').length === 8) handleCepLookup(); }}
                maxLength={9}
                placeholder="00000-000"
              />
              <button
                type="button"
                onClick={handleCepLookup}
                disabled={cepLoading}
                title="Buscar CEP"
                className="flex-shrink-0 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {cepLoading
                  ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin block" />
                  : <Search size={16} className="text-gray-600" />}
              </button>
            </div>
            {cepError && <p className="text-red-500 text-xs mt-1">{cepError}</p>}
          </div>
          <div>
            <label className={labelClass}>Cidade</label>
            <input {...register('cidade')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <select {...register('estado')} className={inputClass}>
              <option value="">Selecione...</option>
              {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>Observacoes</label>
          <textarea {...register('observacoes')} rows={3} className={inputClass} />
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
            onClick={() => navigate('/fabrica/clientes')}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
