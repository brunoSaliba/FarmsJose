export type StatusPedido = 'rascunho' | 'confirmado' | 'enviado' | 'em_processamento' | 'finalizado' | 'cancelado';
export type TipoEmail = 'confirmacao' | 'consolidado';
export type StatusEmail = 'pendente' | 'enviado' | 'falha';
export type PapelFabrica = 'superusuario' | 'seller';

export interface FabricaUnidade {
  id: string;
  user_id: string;
  nome: string;
  email_pedido: string | null;
  ativo: boolean;
  deletado?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FabricaUnidadeCreate {
  nome: string;
  email_pedido?: string | null;
}

export interface FabricaUnidadeUpdate extends Partial<FabricaUnidadeCreate> {
  ativo?: boolean;
}

export interface FabricaUsuario {
  id: string;
  fabrica_id: string;
  user_id: string;
  user_nome: string;
  user_email: string;
  papel: PapelFabrica;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FabricaCreateUser {
  nome: string;
  email: string;
  password: string;
  papel: PapelFabrica;
}

export interface MeuAcesso {
  papel: PapelFabrica;
  ativo: boolean;
  is_system_admin: boolean;
}

export interface FabricaContaResponse {
  user_id: string;
  nome: string;
  email: string;
}

export interface FabricaContaUpdate {
  nome?: string;
  email?: string;
  password?: string;
}

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf_cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  ativo: boolean;
  deletado?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClienteCreate {
  nome: string;
  email: string;
  telefone: string;
  cpf_cnpj?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  observacoes?: string | null;
}

export interface ClienteUpdate extends Partial<ClienteCreate> {
  ativo?: boolean;
}

export interface ItemPedido {
  id: string;
  pedido_id: string;
  produto_id: string | null;
  descricao: string;
  produto_nome: string | null;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  valor_total: number;
}

export interface ItemPedidoCreate {
  produto_id?: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto?: number;
}

export interface Pedido {
  id: string;
  user_id: string;
  numero: number;
  fabrica_id: string | null;
  cliente_id: string;
  nome_cliente: string | null;
  status: StatusPedido;
  observacoes: string | null;
  subtotal: number;
  desconto: number;
  valor_total: number;
  created_at: string;
  updated_at: string;
  itens: ItemPedido[];
  cliente: Cliente | null;
}

export interface PedidoList {
  id: string;
  numero: number;
  fabrica_id: string | null;
  cliente_id: string;
  nome_cliente: string | null;
  status: StatusPedido;
  observacoes: string | null;
  subtotal: number;
  desconto: number;
  valor_total: number;
  created_at: string;
  updated_at: string;
  user_nome: string | null;
}

export interface PedidoCreate {
  fabrica_id?: string | null;
  cliente_id: string;
  observacoes?: string | null;
  desconto?: number;
  itens: ItemPedidoCreate[];
}

export interface PedidoUpdate {
  observacoes?: string | null;
  desconto?: number;
  itens?: ItemPedidoCreate[];
}

export interface EmailLog {
  id: string;
  user_id: string;
  tipo: TipoEmail;
  destinatario: string;
  assunto: string;
  status: StatusEmail;
  erro: string | null;
  pedido_id: string | null;
  created_at: string;
}

export interface Configuracao {
  id: string;
  chave: string;
  valor: string;
  updated_at: string;
}

export interface ConfiguracaoUpsert {
  valor: string;
}

export interface Produto {
  id: string;
  user_id: string;
  fabrica_id: string | null;
  nome: string;
  descricao: string | null;
  sku: string | null;
  unidade: string;
  preco: number;
  ativo: boolean;
  deletado?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProdutoCreate {
  nome: string;
  descricao?: string | null;
  sku?: string | null;
  fabrica_id?: string | null;
  unidade?: string;
  preco: number;
}

export interface ProdutoUpdate extends Partial<ProdutoCreate> {
  ativo?: boolean;
}
