import { db } from './db';
import { enqueue, pullFromServer } from './sync';
import { fazendaApi, animalApi, historicoApi, custoApi } from './api';
import type { Animal, Fazenda, FazendaResumo, HistoricoSanitario, PaginatedResponse, ResumoFazenda, Totalizadores } from '@/types';

/** Retorna true apenas para erros de rede/conectividade (não para 4xx/5xx do servidor). */
function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && (err.message === 'Network Error' || err.message === 'Failed to fetch')) return true;
  const status = (err as { response?: { status?: number } })?.response?.status;
  // sem status = sem resposta do servidor = rede caiu
  return status === undefined;
}

// ─── Fazendas ───────────────────────────────────────────
export const offlineFazendaApi = {
  list: async (params?: { q?: string; estado?: string; cidade?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Fazenda>> => {
    try {
      const result = await fazendaApi.list(params);
      // Cache locally
      if (result.items.length) {
        await db.fazendas.bulkPut(result.items);
      }
      return result;
    } catch {
      // Offline fallback
      let items: Fazenda[] = await db.fazendas.orderBy('nome_fantasia').toArray();
      if (params?.q) {
        const q = params.q.toLowerCase();
        items = items.filter(f =>
          f.nome_fantasia.toLowerCase().includes(q) ||
          f.razao_social.toLowerCase().includes(q) ||
          (f.cnpj && f.cnpj.includes(q))
        );
      }
      if (params?.estado) items = items.filter(f => f.estado === params.estado);
      if (params?.cidade) {
        const c = params.cidade.toLowerCase();
        items = items.filter(f => f.cidade?.toLowerCase().includes(c));
      }
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const total = items.length;
      const pages = Math.ceil(total / limit) || 1;
      const paged = items.slice((page - 1) * limit, page * limit);
      return { items: paged, total, page, limit, pages };
    }
  },

  resumoGeral: async (): Promise<FazendaResumo[]> => {
    try {
      const result = await fazendaApi.resumoGeral();
      return result;
    } catch {
      const fazendas: Fazenda[] = await db.fazendas.toArray();
      const animais: Animal[] = await db.animais.toArray();
      return fazendas.map(f => {
        const farmAnimais = animais.filter(a => a.fazenda_id === f.id);
        const lotes = new Set(farmAnimais.map(a => a.lote_numero));
        return {
          id: f.id,
          nome_fantasia: f.nome_fantasia,
          cidade: f.cidade,
          estado: f.estado,
          total_animais: farmAnimais.length,
          total_lotes: lotes.size,
        };
      });
    }
  },

  get: async (id: string): Promise<Fazenda> => {
    try {
      const result = await fazendaApi.get(id);
      await db.fazendas.put(result);
      return result;
    } catch {
      const local = await db.fazendas.get(id);
      if (local) return local;
      throw new Error('Fazenda nao encontrada offline');
    }
  },

  create: async (data: Partial<Fazenda>): Promise<Fazenda> => {
    try {
      const result = await fazendaApi.create(data);
      await db.fazendas.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      // Offline fallback
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const fazenda: Fazenda = {
        id: tempId,
        id_sistema: 0,
        razao_social: data.razao_social ?? '',
        nome_fantasia: data.nome_fantasia ?? '',
        cnpj: data.cnpj ?? null,
        cpf: data.cpf ?? null,
        telefone: data.telefone ?? null,
        celular: data.celular ?? null,
        endereco: data.endereco ?? null,
        numero_km: data.numero_km ?? null,
        bairro: data.bairro ?? null,
        ponto_referencia: data.ponto_referencia ?? null,
        cep: data.cep ?? null,
        email: data.email ?? null,
        caixa_postal: data.caixa_postal ?? null,
        cidade: data.cidade ?? null,
        estado: data.estado ?? null,
        data_cadastro: (data as any).data_cadastro ?? now.split('T')[0],
        created_at: now,
        updated_at: now,
      };
      await db.fazendas.put(fazenda);
      await enqueue({ entity: 'fazenda', action: 'create', entityId: tempId, payload: data as Record<string, unknown> });
      return fazenda;
    }
  },

  update: async (id: string, data: Partial<Fazenda>): Promise<Fazenda> => {
    try {
      const result = await fazendaApi.update(id, data);
      await db.fazendas.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      // Offline fallback
      const now = new Date().toISOString();
      await db.fazendas.update(id, { ...data, updated_at: now });
      await enqueue({ entity: 'fazenda', action: 'update', entityId: id, payload: data as Record<string, unknown> });
      const updated = await db.fazendas.get(id);
      return updated!;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await fazendaApi.delete(id);
      await db.fazendas.delete(id);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      // Offline fallback
      await db.fazendas.delete(id);
      await enqueue({ entity: 'fazenda', action: 'delete', entityId: id });
    }
  },
};

// ─── Animais ────────────────────────────────────────────
export const offlineAnimalApi = {
  list: async (params?: { fazenda_id?: string; sexo?: string; lote_numero?: number; q?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Animal>> => {
    try {
      const result = await animalApi.list(params);
      if (result.items.length) {
        await db.animais.bulkPut(result.items);
      }
      return result;
    } catch {
      let items: Animal[] = await db.animais.orderBy('lote_numero').toArray();
      if (params?.fazenda_id) items = items.filter(a => a.fazenda_id === params.fazenda_id);
      if (params?.sexo) items = items.filter(a => a.sexo === params.sexo);
      if (params?.lote_numero) items = items.filter(a => a.lote_numero === params.lote_numero);
      if (params?.q) {
        const q = params.q.toLowerCase();
        items = items.filter(a =>
          a.codigo_identificacao?.toLowerCase().includes(q) ||
          a.origem?.toLowerCase().includes(q)
        );
      }
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const total = items.length;
      const pages = Math.ceil(total / limit) || 1;
      const paged = items.slice((page - 1) * limit, page * limit);
      return { items: paged, total, page, limit, pages };
    }
  },

  get: async (id: string): Promise<Animal> => {
    try {
      const result = await animalApi.get(id);
      await db.animais.put(result);
      return result;
    } catch {
      const local = await db.animais.get(id);
      if (local) return local;
      throw new Error('Animal nao encontrado offline');
    }
  },

  create: async (data: Partial<Animal>): Promise<Animal> => {
    try {
      const result = await animalApi.create(data);
      await db.animais.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      // Offline fallback
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const animal: Animal = {
        id: tempId,
        fazenda_id: data.fazenda_id ?? '',
        lote_numero: data.lote_numero ?? 0,
        tipo_identificacao: data.tipo_identificacao ?? null,
        codigo_identificacao: data.codigo_identificacao ?? null,
        sexo: data.sexo ?? 'M',
        is_vaca: data.is_vaca ?? false,
        is_touro: data.is_touro ?? false,
        is_cria: data.is_cria ?? false,
        is_recria: data.is_recria ?? false,
        is_engorda: data.is_engorda ?? false,
        idade_meses: data.idade_meses ?? null,
        peso_inicial_kg: data.peso_inicial_kg ?? null,
        preco_compra: data.preco_compra ?? 0,
        origem: data.origem ?? null,
        historico_sanitario: data.historico_sanitario ?? null,
        data_primeira_pesagem: data.data_primeira_pesagem ?? null,
        data_cadastro: now.split('T')[0],
        created_at: now,
        updated_at: now,
      };
      await db.animais.put(animal);
      await enqueue({
        entity: 'animal',
        action: 'create',
        entityId: tempId,
        parentId: data.fazenda_id,
        payload: data as Record<string, unknown>,
      });
      return animal;
    }
  },

  update: async (id: string, data: Partial<Animal>): Promise<Animal> => {
    try {
      const result = await animalApi.update(id, data);
      await db.animais.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      // Offline fallback
      const now = new Date().toISOString();
      await db.animais.update(id, { ...data, updated_at: now });
      await enqueue({ entity: 'animal', action: 'update', entityId: id, payload: data as Record<string, unknown> });
      const updated = await db.animais.get(id);
      return updated!;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await animalApi.delete(id);
      await db.animais.delete(id);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      // Offline fallback
      await db.animais.delete(id);
      await enqueue({ entity: 'animal', action: 'delete', entityId: id });
    }
  },

  totalizadores: async (fazendaId: string): Promise<Totalizadores> => {
    try {
      return await animalApi.totalizadores(fazendaId);
    } catch {
      const items: Animal[] = await db.animais.where('fazenda_id').equals(fazendaId).toArray();
      return {
        total_animais: items.length,
        total_machos: items.filter(a => a.sexo === 'M').length,
        total_femeas: items.filter(a => a.sexo === 'F').length,
        total_vaca: items.filter(a => a.is_vaca).length,
        total_touro: items.filter(a => a.is_touro).length,
        total_cria: items.filter(a => a.is_cria).length,
        total_recria: items.filter(a => a.is_recria).length,
        total_engorda: items.filter(a => a.is_engorda).length,
        custo_total_lote: items.reduce((s, a) => s + a.preco_compra, 0),
      };
    }
  },
};

// ─── Historico Sanitario (online-only write, offline read) ──
export const offlineHistoricoApi = {
  list: async (animalId: string): Promise<HistoricoSanitario[]> => {
    try {
      const result = await historicoApi.list(animalId);
      for (const h of result) await db.historicos.put(h);
      return result;
    } catch {
      return db.historicos.where('animal_id').equals(animalId).toArray();
    }
  },

  create: async (animalId: string, data: { vacina: string; data_aplicacao: string; observacao?: string }): Promise<HistoricoSanitario> => {
    try {
      const result = await historicoApi.create(animalId, data);
      await db.historicos.put(result);
      return result;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      // Offline fallback
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const hist: HistoricoSanitario = {
        id: tempId,
        animal_id: animalId,
        vacina: data.vacina,
        data_aplicacao: data.data_aplicacao,
        observacao: data.observacao ?? null,
        created_at: now,
      };
      await db.historicos.put(hist);
      await enqueue({
        entity: 'historico',
        action: 'create',
        entityId: tempId,
        parentId: animalId,
        payload: data as Record<string, unknown>,
      });
      return hist;
    }
  },

  delete: async (animalId: string, historicoId: string): Promise<void> => {
    try {
      await historicoApi.delete(animalId, historicoId);
      await db.historicos.delete(historicoId);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      // Offline fallback
      await db.historicos.delete(historicoId);
      await enqueue({
        entity: 'historico',
        action: 'delete',
        entityId: historicoId,
        parentId: animalId,
      });
    }
  },
};

// ─── Custos (online-only, no offline cache) ─────────────
export const offlineCustoApi = {
  resumo: async (fazendaId: string): Promise<ResumoFazenda> => {
    return custoApi.resumo(fazendaId);
  },
  update: async (fazendaId: string, data: { custo_mensal: number; custo_total_animal: number; preco_venda: number }): Promise<ResumoFazenda> => {
    return custoApi.update(fazendaId, data);
  },
};

// ─── Bootstrap ──────────────────────────────────────────
export async function initOffline(): Promise<void> {
  await pullFromServer();
}
