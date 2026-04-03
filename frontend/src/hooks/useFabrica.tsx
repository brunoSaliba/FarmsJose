import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fabricaApi } from '@/lib/fabrica-api';
import type { FabricaUnidade, PapelFabrica } from '@/types/fabrica';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'active_fabrica_id';

interface FabricaContextType {
  fabricas: FabricaUnidade[];
  activeFabrica: FabricaUnidade | null;
  setActiveFabricaId: (id: string) => void;
  isLoading: boolean;
  meuPapel: PapelFabrica | null;
}

const FabricaContext = createContext<FabricaContextType | null>(null);

export function FabricaProvider({ children }: { children: ReactNode }) {
  const { user, hasModule } = useAuth();
  const hasFabrica = !!user && (hasModule('fabrica') || !!user.is_admin);

  const { data, isLoading } = useQuery({
    queryKey: ['fab-fabricas-mine'],
    queryFn: () => fabricaApi.list({ ativo: true, limit: 100 }),
    enabled: hasFabrica,
    staleTime: 5 * 60 * 1000,
  });

  const fabricas = data?.items ?? [];

  const [activeFabricaId, setActiveFabricaIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  // Auto-select first fabrica if stored ID no longer exists in list
  useEffect(() => {
    if (!fabricas.length) return;
    const match = fabricas.find(f => f.id === activeFabricaId);
    if (!match) {
      const first = fabricas[0];
      localStorage.setItem(STORAGE_KEY, first.id);
      setActiveFabricaIdState(first.id);
    }
  }, [fabricas, activeFabricaId]);

  const setActiveFabricaId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveFabricaIdState(id);
  }, []);

  const activeFabrica =
    fabricas.find(f => f.id === activeFabricaId) ?? fabricas[0] ?? null;

  const { data: meuAcesso } = useQuery({
    queryKey: ['fab-meu-acesso', activeFabrica?.id],
    queryFn: () => fabricaApi.meuAcesso(activeFabrica!.id),
    enabled: !!activeFabrica && hasFabrica,
    staleTime: 5 * 60 * 1000,
  });

  const meuPapel: PapelFabrica | null = meuAcesso?.papel ?? null;

  return (
    <FabricaContext.Provider value={{ fabricas, activeFabrica, setActiveFabricaId, isLoading, meuPapel }}>
      {children}
    </FabricaContext.Provider>
  );
}

export function useFabrica() {
  const ctx = useContext(FabricaContext);
  if (!ctx) throw new Error('useFabrica must be used inside FabricaProvider');
  return ctx;
}
