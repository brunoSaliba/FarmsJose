import api from './api';
import type { PaginatedResponse } from '@/types';
import type {
  Cliente,
  ClienteCreate,
  ClienteUpdate,
  Configuracao,
  ConfiguracaoUpsert,
  EmailLog,
  FabricaContaResponse,
  FabricaContaUpdate,
  FabricaCreateUser,
  FabricaUnidade,
  FabricaUnidadeCreate,
  FabricaUnidadeUpdate,
  FabricaUsuario,
  MeuAcesso,
  Pedido,
  PedidoCreate,
  PedidoList,
  PedidoUpdate,
  Produto,
  ProdutoCreate,
  ProdutoUpdate,
  StatusPedido,
} from '@/types/fabrica';

// ─── Fabricas (Unidades) ────────────────────────────────
export const fabricaApi = {
  list: (params?: { q?: string; ativo?: boolean; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<FabricaUnidade>>('/fabricas', { params }).then(r => r.data),
  get: (id: string) =>
    api.get<FabricaUnidade>(`/fabricas/${id}`).then(r => r.data),
  create: (data: FabricaUnidadeCreate) =>
    api.post<FabricaUnidade>('/fabricas', data).then(r => r.data),
  update: (id: string, data: FabricaUnidadeUpdate) =>
    api.put<FabricaUnidade>(`/fabricas/${id}`, data).then(r => r.data),
  deactivate: (id: string) =>
    api.delete(`/fabricas/${id}`).then(r => r.data),
  meuAcesso: (id: string) =>
    api.get<MeuAcesso>(`/fabricas/${id}/meu-acesso`).then(r => r.data),
  listarUsuarios: (id: string) =>
    api.get<FabricaUsuario[]>(`/fabricas/${id}/usuarios`).then(r => r.data),
  criarUsuario: (id: string, data: FabricaCreateUser) =>
    api.post<FabricaUsuario>(`/fabricas/${id}/usuarios/criar`, data).then(r => r.data),
  removerUsuario: (fabricaId: string, vinculoId: string) =>
    api.delete(`/fabricas/${fabricaId}/usuarios/${vinculoId}`).then(r => r.data),
  getConta: (id: string) =>
    api.get<FabricaContaResponse>(`/fabricas/${id}/conta`).then(r => r.data),
  updateConta: (id: string, data: FabricaContaUpdate) =>
    api.put<FabricaContaResponse>(`/fabricas/${id}/conta`, data).then(r => r.data),
};

// ─── Clientes ───────────────────────────────────────────
export const clienteApi = {
  list: (params?: { q?: string; ativo?: boolean; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Cliente>>('/clientes', { params }).then(r => r.data),
  get: (id: string) =>
    api.get<Cliente>(`/clientes/${id}`).then(r => r.data),
  create: (data: ClienteCreate) =>
    api.post<Cliente>('/clientes', data).then(r => r.data),
  update: (id: string, data: ClienteUpdate) =>
    api.put<Cliente>(`/clientes/${id}`, data).then(r => r.data),
  deactivate: (id: string) =>
    api.delete(`/clientes/${id}`).then(r => r.data),
};

// ─── Pedidos ────────────────────────────────────────────
export const pedidoApi = {
  list: (params?: { cliente_id?: string; status?: StatusPedido; data_inicio?: string; data_fim?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<PedidoList>>('/pedidos', { params }).then(r => r.data),
  get: (id: string) =>
    api.get<Pedido>(`/pedidos/${id}`).then(r => r.data),
  create: (data: PedidoCreate) =>
    api.post<Pedido>('/pedidos', data).then(r => r.data),
  update: (id: string, data: PedidoUpdate) =>
    api.put<Pedido>(`/pedidos/${id}`, data).then(r => r.data),
  confirmar: (id: string) =>
    api.patch<Pedido>(`/pedidos/${id}/confirmar`).then(r => r.data),
  cancelar: (id: string) =>
    api.patch<Pedido>(`/pedidos/${id}/cancelar`).then(r => r.data),
  duplicar: (id: string) =>
    api.post<Pedido>(`/pedidos/${id}/duplicar`).then(r => r.data),
};

// ─── Email ──────────────────────────────────────────────
export const emailApi = {
  confirmarPedido: (pedidoId: string) =>
    api.post<EmailLog>(`/email/confirmar-pedido/${pedidoId}`).then(r => r.data),
  relatorio: (data: { data_inicio: string; data_fim: string }) =>
    api.post<EmailLog>('/email/relatorio', data).then(r => r.data),
  logs: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<EmailLog>>('/email/logs', { params }).then(r => r.data),
};

// ─── Configuracoes ──────────────────────────────────────
export const configuracaoApi = {
  list: () =>
    api.get<Configuracao[]>('/configuracoes').then(r => r.data),
  upsert: (chave: string, data: ConfiguracaoUpsert) =>
    api.put<Configuracao>(`/configuracoes/${chave}`, data).then(r => r.data),
};

// ─── Produtos ───────────────────────────────────────────
export const produtoApi = {
  list: (params?: { q?: string; ativo?: boolean; fabrica_id?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Produto>>('/produtos', { params }).then(r => r.data),
  get: (id: string) =>
    api.get<Produto>(`/produtos/${id}`).then(r => r.data),
  create: (data: ProdutoCreate) =>
    api.post<Produto>('/produtos', data).then(r => r.data),
  update: (id: string, data: ProdutoUpdate) =>
    api.put<Produto>(`/produtos/${id}`, data).then(r => r.data),
  deactivate: (id: string) =>
    api.delete(`/produtos/${id}`).then(r => r.data),
};
