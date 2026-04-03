export interface Fazenda {
  id: string;
  id_sistema: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string | null;
  cpf: string | null;
  telefone: string | null;
  celular: string | null;
  endereco: string | null;
  numero_km: string | null;
  bairro: string | null;
  ponto_referencia: string | null;
  cep: string | null;
  email: string | null;
  caixa_postal: string | null;
  cidade: string | null;
  estado: string | null;
  data_cadastro: string;
  created_at: string;
  updated_at: string;
}

export interface Animal {
  id: string;
  fazenda_id: string;
  lote_numero: number;
  tipo_identificacao: string | null;
  codigo_identificacao: string | null;
  sexo: 'M' | 'F';
  is_vaca: boolean;
  is_touro: boolean;
  is_cria: boolean;
  is_recria: boolean;
  is_engorda: boolean;
  idade_meses: number | null;
  peso_inicial_kg: number | null;
  preco_compra: number;
  origem: string | null;
  historico_sanitario: string | null;
  data_primeira_pesagem: string | null;
  data_cadastro: string;
  created_at: string;
  updated_at: string;
}

export interface HistoricoSanitario {
  id: string;
  animal_id: string;
  vacina: string;
  data_aplicacao: string;
  observacao: string | null;
  created_at: string;
}

export interface Totalizadores {
  total_animais: number;
  total_machos: number;
  total_femeas: number;
  total_vaca: number;
  total_touro: number;
  total_cria: number;
  total_recria: number;
  total_engorda: number;
  custo_total_lote: number;
}

export interface ResumoFazenda {
  fazenda_id: string;
  id_sistema: number;
  nome_fantasia: string;
  custo_total_lote: number;
  total_animais: number;
  preco_animal: number;
  custo_mensal: number;
  custo_diario: number;
  custo_total_animal: number;
  preco_venda: number;
  lucro: number;
}

export interface FazendaResumo {
  id: string;
  nome_fantasia: string;
  cidade: string | null;
  estado: string | null;
  total_animais: number;
  total_lotes: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface UserInfo {
  id: string;
  nome: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  modulos: string[];
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
