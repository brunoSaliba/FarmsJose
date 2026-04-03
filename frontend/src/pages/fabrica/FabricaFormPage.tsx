import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft } from 'lucide-react';
import { offlineFabricaApi } from '@/lib/fabrica-offline';
import { fabricaApi } from '@/lib/fabrica-api';
import { useAuth } from '@/hooks/useAuth';

const baseSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatorio'),
  email_pedido: z.string().email('Email invalido').optional().or(z.literal('')),
  ativo: z.boolean().default(true),
});

const adminCreateSchema = baseSchema.extend({
  admin_nome: z.string().min(2, 'Nome muito curto'),
  admin_email: z.string().email('Email invalido'),
  admin_password: z.string().min(4, 'Minimo 4 caracteres'),
});

const adminEditSchema = baseSchema.extend({
  conta_nome: z.string().min(2, 'Nome muito curto').optional().or(z.literal('')),
  conta_email: z.string().email('Email invalido').optional().or(z.literal('')),
  conta_password: z.string().min(4, 'Minimo 4 caracteres').optional().or(z.literal('')),
});

type FormData = z.infer<typeof adminCreateSchema> & z.infer<typeof adminEditSchema>;

export default function FabricaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const isSystemAdmin = !!user?.is_admin;

  const { data: fabrica } = useQuery({
    queryKey: ['fab-fabrica', id],
    queryFn: () => offlineFabricaApi.get(id!),
    enabled: isEdit,
  });

  const { data: conta } = useQuery({
    queryKey: ['fab-fabrica-conta', id],
    queryFn: () => fabricaApi.getConta(id!),
    enabled: isEdit && isSystemAdmin,
  });

  const schema = isEdit
    ? (isSystemAdmin ? adminEditSchema : baseSchema)
    : (isSystemAdmin ? adminCreateSchema : baseSchema);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      email_pedido: '',
      ativo: true,
      admin_nome: '',
      admin_email: '',
      admin_password: '',
      conta_nome: '',
      conta_email: '',
      conta_password: '',
    },
  });

  useEffect(() => {
    if (fabrica) {
      reset({
        nome: fabrica.nome,
        email_pedido: fabrica.email_pedido || '',
        ativo: fabrica.ativo,
        conta_nome: conta?.nome || '',
        conta_email: conta?.email || '',
        conta_password: '',
      });
    }
  }, [fabrica, conta, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEdit) {
        const payload = {
          nome: data.nome,
          email_pedido: data.email_pedido || null,
          ativo: data.ativo,
        };
        await offlineFabricaApi.update(id!, payload);
        // Update admin account if system admin and any account field changed
        if (isSystemAdmin) {
          const contaNome = data.conta_nome?.trim();
          const contaEmail = data.conta_email?.trim();
          const contaPassword = data.conta_password?.trim();
          if (contaNome || contaEmail || contaPassword) {
            await fabricaApi.updateConta(id!, {
              nome: contaNome || undefined,
              email: contaEmail || undefined,
              password: contaPassword || undefined,
            });
          }
        }
        return;
      }
      const payload = {
        nome: data.nome,
        email_pedido: data.email_pedido || null,
        ...(isSystemAdmin ? {
          admin_nome: data.admin_nome,
          admin_email: data.admin_email,
          admin_password: data.admin_password,
        } : {}),
      };
      // System admin bypasses offline — password must not sit in sync queue
      return isSystemAdmin
        ? fabricaApi.create(payload)
        : offlineFabricaApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fab-fabricas'] });
      queryClient.invalidateQueries({ queryKey: ['fab-fabricas-mine'] });
      queryClient.invalidateQueries({ queryKey: ['fab-fabrica-conta', id] });
      navigate('/fabrica/unidades');
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
          {isEdit ? 'Editar Fabrica' : 'Nova Fabrica'}
        </h1>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input {...register('nome')} className={inputClass} />
            {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Email para Pedidos</label>
            <input {...register('email_pedido')} type="email" className={inputClass} placeholder="email@exemplo.com" />
            {errors.email_pedido && <p className="text-red-500 text-xs mt-1">{errors.email_pedido.message}</p>}
          </div>
        </div>

        {/* Admin credentials — only on create, only for system admin */}
        {!isEdit && isSystemAdmin && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conta da Fabrica</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Nome do responsavel *</label>
                <input {...register('admin_nome')} className={inputClass} placeholder="Nome completo" />
                {errors.admin_nome && <p className="text-red-500 text-xs mt-1">{errors.admin_nome.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Email de acesso *</label>
                <input {...register('admin_email')} type="email" className={inputClass} placeholder="email@fabrica.com" />
                {errors.admin_email && <p className="text-red-500 text-xs mt-1">{errors.admin_email.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Senha *</label>
                <input {...register('admin_password')} type="password" className={inputClass} placeholder="Minimo 4 caracteres" />
                {errors.admin_password && <p className="text-red-500 text-xs mt-1">{errors.admin_password.message}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Edit admin account — only on edit, only for system admin */}
        {isEdit && isSystemAdmin && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conta da Fabrica</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Nome do responsavel</label>
                <input {...register('conta_nome')} className={inputClass} placeholder="Nome completo" />
                {errors.conta_nome && <p className="text-red-500 text-xs mt-1">{errors.conta_nome.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Email de acesso</label>
                <input {...register('conta_email')} type="email" className={inputClass} placeholder="email@fabrica.com" />
                {errors.conta_email && <p className="text-red-500 text-xs mt-1">{errors.conta_email.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Nova senha <span className="text-gray-400 font-normal">(deixe em branco para manter)</span></label>
                <input {...register('conta_password')} type="password" className={inputClass} placeholder="Minimo 4 caracteres" />
                {errors.conta_password && <p className="text-red-500 text-xs mt-1">{errors.conta_password.message}</p>}
              </div>
            </div>
          </div>
        )}

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
            onClick={() => navigate('/fabrica/unidades')}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
