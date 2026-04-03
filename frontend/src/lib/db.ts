import Dexie, { type Table } from 'dexie';
import type { Fazenda, Animal, HistoricoSanitario } from '@/types';
import type { Cliente, FabricaUnidade, Pedido, Produto } from '@/types/fabrica';

export interface SyncAction {
  id?: number;
  entity: 'fazenda' | 'animal' | 'historico' | 'cliente' | 'pedido' | 'produto' | 'fabrica';
  action: 'create' | 'update' | 'delete';
  entityId: string;
  parentId?: string;
  payload?: Record<string, unknown>;
  createdAt: number;
}

class FarmsJoseDB extends Dexie {
  fazendas!: Table<Fazenda, string>;
  animais!: Table<Animal, string>;
  historicos!: Table<HistoricoSanitario, string>;
  clientes!: Table<Cliente, string>;
  pedidos!: Table<Pedido, string>;
  produtos!: Table<Produto, string>;
  fabricas!: Table<FabricaUnidade, string>;
  syncQueue!: Table<SyncAction, number>;

  constructor() {
    super('farmsjose');

    this.version(1).stores({
      fazendas: 'id, id_sistema, nome_fantasia, cnpj, estado, cidade',
      animais: 'id, fazenda_id, lote_numero, sexo, codigo_identificacao',
      historicos: 'id, animal_id',
      syncQueue: '++id, entity, action, entityId, createdAt',
    });

    this.version(2).stores({
      fazendas: 'id, id_sistema, nome_fantasia, cnpj, estado, cidade',
      animais: 'id, fazenda_id, lote_numero, sexo, codigo_identificacao',
      historicos: 'id, animal_id',
      clientes: 'id, user_id, nome, email, ativo',
      pedidos: 'id, user_id, numero, cliente_id, status, created_at',
      syncQueue: '++id, entity, action, entityId, createdAt',
    });

    this.version(3).stores({
      fazendas: 'id, id_sistema, nome_fantasia, cnpj, estado, cidade',
      animais: 'id, fazenda_id, lote_numero, sexo, codigo_identificacao',
      historicos: 'id, animal_id',
      clientes: 'id, user_id, nome, email, ativo',
      pedidos: 'id, user_id, numero, cliente_id, status, created_at',
      produtos: 'id, user_id, nome, ativo',
      syncQueue: '++id, entity, action, entityId, createdAt',
    });

    this.version(4).stores({
      fazendas: 'id, id_sistema, nome_fantasia, cnpj, estado, cidade',
      animais: 'id, fazenda_id, lote_numero, sexo, codigo_identificacao',
      historicos: 'id, animal_id',
      clientes: 'id, user_id, nome, email, ativo',
      pedidos: 'id, user_id, numero, cliente_id, status, created_at',
      produtos: 'id, user_id, nome, ativo, fabrica_id',
      fabricas: 'id, user_id, nome, ativo',
      syncQueue: '++id, entity, action, entityId, createdAt',
    });
  }
}

export const db = new FarmsJoseDB();
