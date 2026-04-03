import axios from 'axios';
import type { Animal, Fazenda, FazendaResumo, HistoricoSanitario, PaginatedResponse, ResumoFazenda, TokenResponse, Totalizadores, UserInfo } from '@/types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send httpOnly cookies on every request
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const fabricaId = localStorage.getItem('active_fabrica_id');
  if (fabricaId) {
    config.headers['X-Fabrica-Id'] = fabricaId;
  }
  return config;
});

// Track whether a refresh is in progress to avoid parallel refresh calls
let _refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (_refreshing) return _refreshing;
  _refreshing = axios
    .post<TokenResponse>('/api/v1/auth/refresh', {}, { withCredentials: true })
    .then(r => {
      localStorage.setItem('access_token', r.data.access_token);
      return r.data.access_token;
    })
    .catch(() => {
      localStorage.removeItem('access_token');
      return null;
    })
    .finally(() => { _refreshing = null; });
  return _refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginUrl = originalRequest?.url?.includes('/auth/login');
    const isRefreshUrl = originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !isLoginUrl && !isRefreshUrl && !originalRequest._retried) {
      originalRequest._retried = true;
      const newToken = await tryRefresh();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      // Refresh failed — redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }).then(r => r.data),
  logout: () =>
    api.post('/auth/logout').catch(() => {}),
  me: () => api.get<UserInfo>('/auth/me').then(r => r.data),
  updateMe: (data: { nome?: string; email?: string; password?: string; current_password?: string }) =>
    api.put<UserInfo>('/auth/me', data).then(r => r.data),
  listUsers: () => api.get<UserInfo[]>('/auth/users').then(r => r.data),
  createUser: (data: { nome: string; email: string; password: string; is_admin?: boolean; modulos?: string[] }) =>
    api.post<UserInfo>('/auth/users', data).then(r => r.data),
  updateUser: (id: string, data: Partial<{ nome: string; email: string; password: string; is_admin: boolean; is_active: boolean; modulos: string[] }>) =>
    api.put<UserInfo>(`/auth/users/${id}`, data).then(r => r.data),
  deleteUser: (id: string) =>
    api.delete(`/auth/users/${id}`).then(r => r.data),
};

export interface QueryResult {
  columns: string[];
  rows: (string | null)[][];
  row_count: number;
  truncated: boolean;
}

export const adminApi = {
  runQuery: (sql: string) =>
    api.post<QueryResult>('/admin/query', { sql }).then(r => r.data),
};

// Fazendas
export const fazendaApi = {
  list: (params?: { q?: string; estado?: string; cidade?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Fazenda>>('/fazendas', { params }).then(r => r.data),
  resumoGeral: () =>
    api.get<FazendaResumo[]>('/fazendas/resumo-geral').then(r => r.data),
  get: (id: string) => api.get<Fazenda>(`/fazendas/${id}`).then(r => r.data),
  create: (data: Partial<Fazenda>) => api.post<Fazenda>('/fazendas', data).then(r => r.data),
  update: (id: string, data: Partial<Fazenda>) => api.put<Fazenda>(`/fazendas/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/fazendas/${id}`).then(r => r.data),
};

// Animais
export const animalApi = {
  list: (params?: { fazenda_id?: string; sexo?: string; lote_numero?: number; q?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Animal>>('/animais', { params }).then(r => r.data),
  get: (id: string) => api.get<Animal>(`/animais/${id}`).then(r => r.data),
  create: (data: Partial<Animal>) => api.post<Animal>('/animais', data).then(r => r.data),
  update: (id: string, data: Partial<Animal>) => api.put<Animal>(`/animais/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/animais/${id}`).then(r => r.data),
  totalizadores: (fazendaId: string) =>
    api.get<Totalizadores>(`/animais/totalizadores/${fazendaId}`).then(r => r.data),
};

// Historico Sanitario
export const historicoApi = {
  list: (animalId: string) =>
    api.get<HistoricoSanitario[]>(`/animais/${animalId}/historico`).then(r => r.data),
  create: (animalId: string, data: { vacina: string; data_aplicacao: string; observacao?: string }) =>
    api.post<HistoricoSanitario>(`/animais/${animalId}/historico`, data).then(r => r.data),
  delete: (animalId: string, historicoId: string) =>
    api.delete(`/animais/${animalId}/historico/${historicoId}`).then(r => r.data),
};

// Custos
export const custoApi = {
  resumo: (fazendaId: string) =>
    api.get<ResumoFazenda>(`/fazendas/${fazendaId}/custos/resumo`).then(r => r.data),
  update: (fazendaId: string, data: { custo_mensal: number; custo_total_animal: number; preco_venda: number }) =>
    api.put<ResumoFazenda>(`/fazendas/${fazendaId}/custos`, data).then(r => r.data),
};

export default api;
