import { useEffect, useState, useCallback } from 'react';
import { syncAll, onSyncStatusChange, getPendingCount } from '@/lib/sync';

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

export function usePendingSync() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    getPendingCount().then(setPending);
    const unsub = onSyncStatusChange(setPending);
    return () => { unsub(); };
  }, []);

  return pending;
}

export function useAutoSync(queryClient?: { invalidateQueries: (opts: { queryKey?: string[] }) => void }) {
  const online = useOnlineStatus();

  const doSync = useCallback(async () => {
    const { synced } = await syncAll();
    if (synced > 0 && queryClient) {
      queryClient.invalidateQueries({});
    }
  }, [queryClient]);

  useEffect(() => {
    if (!online) return;
    // Sync when coming back online
    doSync();
    // Also sync periodically while online
    const interval = setInterval(doSync, 30_000);
    return () => clearInterval(interval);
  }, [online, doSync]);
}
