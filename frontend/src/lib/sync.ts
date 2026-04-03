import { db, type SyncAction } from './db';
import api from './api';

let syncing = false;
const listeners = new Set<(pending: number) => void>();

export function onSyncStatusChange(fn: (pending: number) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function notifyListeners() {
  const count = await db.syncQueue.count();
  listeners.forEach(fn => fn(count));
}

async function processAction(action: SyncAction): Promise<boolean> {
  try {
    switch (action.entity) {
      case 'fazenda':
        if (action.action === 'create') {
          const created = await api.post('/fazendas', action.payload).then(r => r.data);
          await db.fazendas.delete(action.entityId);
          await db.fazendas.put(created);
          // Update animals that reference this temp ID
          const animalsToFix = await db.animais.where('fazenda_id').equals(action.entityId).toArray();
          for (const a of animalsToFix) {
            await db.animais.update(a.id, { fazenda_id: created.id });
          }
          // Update pending sync actions referencing this temp ID
          const pendingAnimalActions = await db.syncQueue
            .where('parentId').equals(action.entityId).toArray();
          for (const pa of pendingAnimalActions) {
            await db.syncQueue.update(pa.id!, { parentId: created.id });
            if (pa.payload) {
              await db.syncQueue.update(pa.id!, {
                payload: { ...pa.payload, fazenda_id: created.id },
              });
            }
          }
        } else if (action.action === 'update') {
          await api.put(`/fazendas/${action.entityId}`, action.payload);
        } else if (action.action === 'delete') {
          await api.delete(`/fazendas/${action.entityId}`);
        }
        break;

      case 'animal':
        if (action.action === 'create') {
          const created = await api.post('/animais', action.payload).then(r => r.data);
          await db.animais.delete(action.entityId);
          await db.animais.put(created);
          // Update historicos that reference this temp ID
          const histToFix = await db.historicos.where('animal_id').equals(action.entityId).toArray();
          for (const h of histToFix) {
            await db.historicos.update(h.id, { animal_id: created.id });
          }
        } else if (action.action === 'update') {
          await api.put(`/animais/${action.entityId}`, action.payload);
        } else if (action.action === 'delete') {
          await api.delete(`/animais/${action.entityId}`);
        }
        break;

      case 'historico':
        if (action.action === 'create') {
          const created = await api.post(
            `/animais/${action.parentId}/historico`,
            action.payload,
          ).then(r => r.data);
          await db.historicos.delete(action.entityId);
          await db.historicos.put(created);
        } else if (action.action === 'delete') {
          await api.delete(`/animais/${action.parentId}/historico/${action.entityId}`);
        }
        break;

      case 'cliente':
        if (action.action === 'create') {
          const created = await api.post('/clientes', action.payload).then(r => r.data);
          await db.clientes.delete(action.entityId);
          await db.clientes.put(created);
          // Update pedidos that reference this temp client ID
          const pedidosToFix = await db.pedidos.where('cliente_id').equals(action.entityId).toArray();
          for (const p of pedidosToFix) {
            await db.pedidos.update(p.id, { cliente_id: created.id });
          }
          const pendingPedidoActions = await db.syncQueue
            .where('parentId').equals(action.entityId).toArray();
          for (const pa of pendingPedidoActions) {
            await db.syncQueue.update(pa.id!, { parentId: created.id });
            if (pa.payload) {
              await db.syncQueue.update(pa.id!, {
                payload: { ...pa.payload, cliente_id: created.id },
              });
            }
          }
        } else if (action.action === 'update') {
          await api.put(`/clientes/${action.entityId}`, action.payload);
        } else if (action.action === 'delete') {
          await api.delete(`/clientes/${action.entityId}`);
        }
        break;

      case 'pedido':
        if (action.action === 'create') {
          const created = await api.post('/pedidos', action.payload).then(r => r.data);
          await db.pedidos.delete(action.entityId);
          await db.pedidos.put(created);
        } else if (action.action === 'update') {
          await api.put(`/pedidos/${action.entityId}`, action.payload);
        } else if (action.action === 'delete') {
          await api.delete(`/pedidos/${action.entityId}`);
        }
        break;

      case 'produto':
        if (action.action === 'create') {
          const created = await api.post('/produtos', action.payload).then(r => r.data);
          await db.produtos.delete(action.entityId);
          await db.produtos.put(created);
        } else if (action.action === 'update') {
          await api.put(`/produtos/${action.entityId}`, action.payload);
        } else if (action.action === 'delete') {
          await api.delete(`/produtos/${action.entityId}`);
        }
        break;

      case 'fabrica':
        if (action.action === 'create') {
          const created = await api.post('/fabricas', action.payload).then(r => r.data);
          await db.fabricas.delete(action.entityId);
          await db.fabricas.put(created);
          // Update produtos that reference this temp fabrica ID
          const produtosToFix = await db.produtos.where('fabrica_id').equals(action.entityId).toArray();
          for (const p of produtosToFix) {
            await db.produtos.update(p.id, { fabrica_id: created.id });
          }
        } else if (action.action === 'update') {
          await api.put(`/fabricas/${action.entityId}`, action.payload);
        } else if (action.action === 'delete') {
          await api.delete(`/fabricas/${action.entityId}`);
        }
        break;
    }
    return true;
  } catch (err: any) {
    if (err?.response?.status >= 400 && err?.response?.status < 500) {
      console.error('[Sync] Permanent error, discarding action:', action, err.response.data);
      return true; // discard permanently failed actions (4xx)
    }
    return false; // retry on network/server errors
  }
}

export async function syncAll(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const actions = await db.syncQueue.orderBy('createdAt').toArray();
    for (const action of actions) {
      const ok = await processAction(action);
      if (ok) {
        await db.syncQueue.delete(action.id!);
        synced++;
      } else {
        failed++;
        break; // stop on first network failure to preserve order
      }
    }
  } finally {
    syncing = false;
    await notifyListeners();
  }

  return { synced, failed };
}

export async function pullFromServer(): Promise<void> {
  try {
    // Only pull if there are no pending sync operations
    const pendingCount = await db.syncQueue.count();
    if (pendingCount > 0) return;

    const [fazendasRes, animaisRes, clientesRes, pedidosRes, produtosRes, fabricasRes] = await Promise.all([
      api.get('/fazendas', { params: { limit: 10000 } }).then(r => r.data),
      api.get('/animais', { params: { limit: 10000 } }).then(r => r.data),
      api.get('/clientes', { params: { limit: 10000 } }).then(r => r.data).catch(() => ({ items: [] })),
      api.get('/pedidos', { params: { limit: 10000 } }).then(r => r.data).catch(() => ({ items: [] })),
      api.get('/produtos', { params: { limit: 10000 } }).then(r => r.data).catch(() => ({ items: [] })),
      api.get('/fabricas', { params: { limit: 10000 } }).then(r => r.data).catch(() => ({ items: [] })),
    ]);

    await db.fazendas.clear();
    await db.animais.clear();
    await db.clientes.clear();
    await db.pedidos.clear();
    await db.produtos.clear();
    await db.fabricas.clear();
    if (fazendasRes.items?.length) await db.fazendas.bulkPut(fazendasRes.items);
    if (animaisRes.items?.length) await db.animais.bulkPut(animaisRes.items);
    if (clientesRes.items?.length) await db.clientes.bulkPut(clientesRes.items);
    if (pedidosRes.items?.length) await db.pedidos.bulkPut(pedidosRes.items);
    if (produtosRes.items?.length) await db.produtos.bulkPut(produtosRes.items);
    if (fabricasRes.items?.length) await db.fabricas.bulkPut(fabricasRes.items);
  } catch {
    // offline — ignore, local data is still valid
  }
}

export async function enqueue(action: Omit<SyncAction, 'id' | 'createdAt'>): Promise<void> {
  await db.syncQueue.add({ ...action, createdAt: Date.now() });
  await notifyListeners();

  // Try to sync immediately if online
  if (navigator.onLine) {
    syncAll().catch(() => {});
  }
}

export function getPendingCount(): Promise<number> {
  return db.syncQueue.count();
}

export async function clearLocalData(): Promise<void> {
  await db.syncQueue.clear();
  await db.fazendas.clear();
  await db.animais.clear();
  await db.historicos.clear();
  await db.clientes.clear();
  await db.pedidos.clear();
  await db.produtos.clear();
  await db.fabricas.clear();
  await notifyListeners();
}
