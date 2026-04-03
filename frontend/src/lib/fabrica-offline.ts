import { db } from './db';
import { enqueue } from './sync';
import { clienteApi, fabricaApi, pedidoApi, produtoApi } from './fabrica-api';
import type { PaginatedResponse } from '@/types';
import type { Cliente, ClienteCreate, ClienteUpdate, FabricaUnidade, FabricaUnidadeCreate, FabricaUnidadeUpdate, Pedido, PedidoCreate, PedidoUpdate, PedidoList, StatusPedido, Produto, ProdutoCreate, ProdutoUpdate } from '@/types/fabrica';

/** Retorna true apenas para erros de rede/conectividade (não para 4xx/5xx do servidor). */
function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && (err.message === 'Network Error' || err.message === 'Failed to fetch')) return true;
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === undefined;
}

// ─── Fabricas (Unidades) ────────────────────────────────
export const offlineFabricaApi = {
  list: async (params?: { q?: string; ativo?: boolean; page?: number; limit?: number }): Promise<PaginatedResponse<FabricaUnidade>> => {
    try {
      const result = await fabricaApi.list(params);
      if (result.items.length) {
        await db.fabricas.bulkPut(result.items);
      }
      return result;
    } catch {
      let items: FabricaUnidade[] = await db.fabricas.orderBy('nome').toArray();
      items = items.filter(f => !f.deletado);
      if (params?.q) {
        const q = params.q.toLowerCase();
        items = items.filter(f => f.nome.toLowerCase().includes(q));
      }
      if (params?.ativo !== undefined) {
        items = items.filter(f => f.ativo === params.ativo);
      }
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const total = items.length;
      const pages = Math.ceil(total / limit) || 1;
      const paged = items.slice((page - 1) * limit, page * limit);
      return { items: paged, total, page, limit, pages };
    }
  },

  get: async (id: string): Promise<FabricaUnidade> => {
    try {
      const result = await fabricaApi.get(id);
      await db.fabricas.put(result);
      return result;
    } catch {
      const local = await db.fabricas.get(id);
      if (local) return local;
      throw new Error('Fabrica nao encontrada offline');
    }
  },

  create: async (data: FabricaUnidadeCreate): Promise<FabricaUnidade> => {
    try {
      const result = await fabricaApi.create(data);
      await db.fabricas.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const fabrica: FabricaUnidade = {
        id: tempId,
        user_id: '',
        nome: data.nome,
        email_pedido: data.email_pedido ?? null,
        ativo: true,
        created_at: now,
        updated_at: now,
      };
      await db.fabricas.put(fabrica);
      await enqueue({ entity: 'fabrica', action: 'create', entityId: tempId, payload: data as unknown as Record<string, unknown> });
      return fabrica;
    }
  },

  update: async (id: string, data: FabricaUnidadeUpdate): Promise<FabricaUnidade> => {
    try {
      const result = await fabricaApi.update(id, data);
      await db.fabricas.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const now = new Date().toISOString();
      await db.fabricas.update(id, { ...data, updated_at: now });
      await enqueue({ entity: 'fabrica', action: 'update', entityId: id, payload: data as unknown as Record<string, unknown> });
      const updated = await db.fabricas.get(id);
      return updated!;
    }
  },

  deactivate: async (id: string): Promise<void> => {
    try {
      await fabricaApi.deactivate(id);
      await db.fabricas.update(id, { deletado: true, updated_at: new Date().toISOString() });
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      await db.fabricas.update(id, { deletado: true, updated_at: new Date().toISOString() });
      await enqueue({ entity: 'fabrica', action: 'delete', entityId: id });
    }
  },
};

// ─── Clientes ───────────────────────────────────────────
export const offlineClienteApi = {
  list: async (params?: { q?: string; ativo?: boolean; page?: number; limit?: number }): Promise<PaginatedResponse<Cliente>> => {
    try {
      const result = await clienteApi.list(params);
      if (result.items.length) {
        await db.clientes.bulkPut(result.items);
      }
      return result;
    } catch {
      let items: Cliente[] = await db.clientes.orderBy('nome').toArray();
      items = items.filter(c => !c.deletado);
      if (params?.q) {
        const q = params.q.toLowerCase();
        items = items.filter(c =>
          c.nome.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.cpf_cnpj && c.cpf_cnpj.includes(q))
        );
      }
      if (params?.ativo !== undefined) {
        items = items.filter(c => c.ativo === params.ativo);
      }
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const total = items.length;
      const pages = Math.ceil(total / limit) || 1;
      const paged = items.slice((page - 1) * limit, page * limit);
      return { items: paged, total, page, limit, pages };
    }
  },

  get: async (id: string): Promise<Cliente> => {
    try {
      const result = await clienteApi.get(id);
      await db.clientes.put(result);
      return result;
    } catch {
      const local = await db.clientes.get(id);
      if (local) return local;
      throw new Error('Cliente nao encontrado offline');
    }
  },

  create: async (data: ClienteCreate): Promise<Cliente> => {
    try {
      const result = await clienteApi.create(data);
      await db.clientes.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const cliente: Cliente = {
        id: tempId,
        user_id: '',
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        cpf_cnpj: data.cpf_cnpj ?? null,
        endereco: data.endereco ?? null,
        cidade: data.cidade ?? null,
        estado: data.estado ?? null,
        cep: data.cep ?? null,
        observacoes: data.observacoes ?? null,
        ativo: true,
        created_at: now,
        updated_at: now,
      };
      await db.clientes.put(cliente);
      await enqueue({ entity: 'cliente', action: 'create', entityId: tempId, payload: data as unknown as Record<string, unknown> });
      return cliente;
    }
  },

  update: async (id: string, data: ClienteUpdate): Promise<Cliente> => {
    try {
      const result = await clienteApi.update(id, data);
      await db.clientes.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const now = new Date().toISOString();
      await db.clientes.update(id, { ...data, updated_at: now });
      await enqueue({ entity: 'cliente', action: 'update', entityId: id, payload: data as unknown as Record<string, unknown> });
      const updated = await db.clientes.get(id);
      return updated!;
    }
  },

  deactivate: async (id: string): Promise<void> => {
    try {
      await clienteApi.deactivate(id);
      await db.clientes.update(id, { deletado: true, updated_at: new Date().toISOString() });
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      await db.clientes.update(id, { deletado: true, updated_at: new Date().toISOString() });
      await enqueue({ entity: 'cliente', action: 'delete', entityId: id });
    }
  },
};

// ─── Pedidos ────────────────────────────────────────────
export const offlinePedidoApi = {
  list: async (params?: { cliente_id?: string; status?: StatusPedido; page?: number; limit?: number }): Promise<PaginatedResponse<PedidoList>> => {
    try {
      const result = await pedidoApi.list(params);
      if (result.items.length) {
        await db.pedidos.bulkPut(result.items as any);
      }
      return result;
    } catch {
      let items: Pedido[] = await db.pedidos.orderBy('created_at').reverse().toArray();
      if (params?.cliente_id) items = items.filter(p => p.cliente_id === params.cliente_id);
      if (params?.status) items = items.filter(p => p.status === params.status);
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const total = items.length;
      const pages = Math.ceil(total / limit) || 1;
      const paged = items.slice((page - 1) * limit, page * limit);
      return { items: paged as any, total, page, limit, pages };
    }
  },

  get: async (id: string): Promise<Pedido> => {
    try {
      const result = await pedidoApi.get(id);
      await db.pedidos.put(result as any);
      return result;
    } catch {
      const local = await db.pedidos.get(id);
      if (local) return local as any;
      throw new Error('Pedido nao encontrado offline');
    }
  },

  create: async (data: PedidoCreate): Promise<Pedido> => {
    try {
      const result = await pedidoApi.create(data);
      await db.pedidos.put(result as any);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const itens = data.itens.map(item => ({
        id: crypto.randomUUID(),
        pedido_id: tempId,
        produto_id: item.produto_id ?? null,
        descricao: item.descricao,
        produto_nome: null,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        desconto: item.desconto ?? 0,
        valor_total: item.quantidade * item.valor_unitario * (1 - (item.desconto ?? 0) / 100),
      }));
      const subtotal = itens.reduce((s, i) => s + i.valor_total, 0);
      const desconto = data.desconto ?? 0;
      const valorTotal = subtotal * (1 - desconto / 100);
      const pedido: Pedido = {
        id: tempId,
        user_id: '',
        numero: 0,
        fabrica_id: data.fabrica_id ?? null,
        cliente_id: data.cliente_id,
        nome_cliente: null,
        status: 'rascunho',
        observacoes: data.observacoes ?? null,
        subtotal,
        desconto,
        valor_total: valorTotal,
        created_at: now,
        updated_at: now,
        itens,
        cliente: null,
      };
      await db.pedidos.put(pedido as any);
      await enqueue({ entity: 'pedido', action: 'create', entityId: tempId, payload: data as unknown as Record<string, unknown> });
      return pedido;
    }
  },

  update: async (id: string, data: PedidoUpdate): Promise<Pedido> => {
    try {
      const result = await pedidoApi.update(id, data);
      await db.pedidos.put(result as any);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = { updated_at: now };
      if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
      if (data.desconto !== undefined) updateData.desconto = data.desconto;
      if (data.itens) {
        const itens = data.itens.map(item => ({
          id: crypto.randomUUID(),
          pedido_id: id,
          produto_id: item.produto_id ?? null,
          descricao: item.descricao,
          produto_nome: null,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          desconto: item.desconto ?? 0,
          valor_total: item.quantidade * item.valor_unitario * (1 - (item.desconto ?? 0) / 100),
        }));
        const subtotal = itens.reduce((s, i) => s + i.valor_total, 0);
        const desconto = data.desconto ?? 0;
        updateData.itens = itens;
        updateData.subtotal = subtotal;
        updateData.valor_total = subtotal * (1 - desconto / 100);
      }
      await db.pedidos.update(id, updateData as any);
      await enqueue({ entity: 'pedido', action: 'update', entityId: id, payload: data as unknown as Record<string, unknown> });
      const updated = await db.pedidos.get(id);
      return updated as any;
    }
  },
};

// ─── Produtos ───────────────────────────────────────────
export const offlineProdutoApi = {
  list: async (params?: { q?: string; ativo?: boolean; page?: number; limit?: number }): Promise<PaginatedResponse<Produto>> => {
    try {
      const result = await produtoApi.list(params);
      if (result.items.length) {
        await db.produtos.bulkPut(result.items);
      }
      return result;
    } catch {
      let items: Produto[] = await db.produtos.orderBy('nome').toArray();
      items = items.filter(p => !p.deletado);
      if (params?.q) {
        const q = params.q.toLowerCase();
        items = items.filter(p =>
          p.nome.toLowerCase().includes(q) ||
          (p.descricao && p.descricao.toLowerCase().includes(q))
        );
      }
      if (params?.ativo !== undefined) {
        items = items.filter(p => p.ativo === params.ativo);
      }
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const total = items.length;
      const pages = Math.ceil(total / limit) || 1;
      const paged = items.slice((page - 1) * limit, page * limit);
      return { items: paged, total, page, limit, pages };
    }
  },

  get: async (id: string): Promise<Produto> => {
    try {
      const result = await produtoApi.get(id);
      await db.produtos.put(result);
      return result;
    } catch {
      const local = await db.produtos.get(id);
      if (local) return local;
      throw new Error('Produto nao encontrado offline');
    }
  },

  create: async (data: ProdutoCreate): Promise<Produto> => {
    try {
      const result = await produtoApi.create(data);
      await db.produtos.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const produto: Produto = {
        id: tempId,
        user_id: '',
        fabrica_id: data.fabrica_id ?? null,
        nome: data.nome,
        descricao: data.descricao ?? null,
        sku: data.sku ?? null,
        unidade: data.unidade ?? 'un',
        preco: data.preco,
        ativo: true,
        created_at: now,
        updated_at: now,
      };
      await db.produtos.put(produto);
      await enqueue({ entity: 'produto', action: 'create', entityId: tempId, payload: data as unknown as Record<string, unknown> });
      return produto;
    }
  },

  update: async (id: string, data: ProdutoUpdate): Promise<Produto> => {
    try {
      const result = await produtoApi.update(id, data);
      await db.produtos.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const now = new Date().toISOString();
      await db.produtos.update(id, { ...data, updated_at: now });
      await enqueue({ entity: 'produto', action: 'update', entityId: id, payload: data as unknown as Record<string, unknown> });
      const updated = await db.produtos.get(id);
      return updated!;
    }
  },

  deactivate: async (id: string): Promise<void> => {
    try {
      await produtoApi.deactivate(id);
      await db.produtos.update(id, { deletado: true, updated_at: new Date().toISOString() });
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      await db.produtos.update(id, { deletado: true, updated_at: new Date().toISOString() });
      await enqueue({ entity: 'produto', action: 'delete', entityId: id });
    }
  },
};
