# Especificação Técnica — Sistema de Gestão de Fazendas (FarmsJose)

**Versão:** 1.0  
**Data:** 31/03/2026  
**Status:** Em elaboração  
**Documento de referência:** EspecificacaoFuncional.md v1.0

---

## 1. Introdução

### 1.1 Propósito

Este documento detalha as decisões técnicas de implementação, arquitetura de software, contratos de API, modelos de dados, padrões de código e configurações de infraestrutura para o sistema FarmsJose. Serve como guia para desenvolvedores durante a construção e manutenção do sistema.

### 1.2 Escopo

- Backend API REST em Python (FastAPI)
- Frontend SPA em React + TypeScript
- Banco de dados PostgreSQL
- Infraestrutura via Docker Compose
- 3 módulos: Cadastro de Fazendas, Cadastro de Animais, Resumo por Fazenda

### 1.3 Stack Tecnológica Detalhada

| Componente | Tecnologia | Versão Mínima | Justificativa |
|---|---|---|---|
| Runtime Backend | Python | 3.12 | Type hints nativos, performance melhorada |
| Framework API | FastAPI | 0.115+ | Async nativo, OpenAPI automático, validação Pydantic |
| ORM | SQLAlchemy | 2.0 | Mapped columns, async support |
| Validação | Pydantic | 2.x | Integrado ao FastAPI, alto desempenho |
| Migrations | Alembic | 1.13+ | Padrão de mercado para SQLAlchemy |
| Server ASGI | Uvicorn | 0.30+ | Alta performance, HTTP/1.1 |
| Banco de Dados | PostgreSQL | 16 | ACID, JSON support, extensões ricas |
| Runtime Frontend | Node.js | 20 LTS | Compatibilidade com dependências |
| Framework UI | React | 18 | Ecosystem maduro, concurrent features |
| Linguagem UI | TypeScript | 5.x | Type safety, DX |
| Build Tool | Vite | 5.x | HMR rápido, build otimizado |
| CSS Framework | Tailwind CSS | 3.x | Utility-first, tree-shaking |
| Component Kit | shadcn/ui | latest | Componentes acessíveis, customizáveis |
| Tabela de Dados | TanStack Table | 8.x | Headless, server-side ready |
| Forms | React Hook Form | 7.x | Performance, validação integrada |
| Validação Frontend | Zod | 3.x | Schema-first, integra com RHF |
| Server State | TanStack Query | 5.x | Cache, revalidation, optimistic updates |
| Roteamento | React Router | 6.x | Padrão de facto para React SPAs |
| HTTP Client | Axios | 1.x | Interceptors, cancelamento, tipagem |
| Containerização | Docker | 24+ | Isolamento, reproducibilidade |
| Orquestração (dev) | Docker Compose | 2.x | Multi-container local |
| Proxy Reverso | Nginx | 1.25+ | Serve SPA + proxy para API |
| Testes Backend | pytest | 8.x | Fixtures, async, cobertura |
| Testes Frontend | Vitest + RTL | — | Integrado ao Vite, Testing Library |

---

## 2. Arquitetura

### 2.1 Visão Geral

Arquitetura client-server com separação completa entre frontend (SPA) e backend (API REST). Comunicação exclusivamente via HTTP/JSON.

### 2.2 Padrão de Camadas (Backend)

```
Router (HTTP) → Service (Business Logic) → Repository (Data Access) → Model (ORM)
```

| Camada | Responsabilidade | Diretório |
|---|---|---|
| **Router** | Recebe HTTP requests, valida input, retorna responses | `app/routers/` |
| **Service** | Lógica de negócio, orquestração, cálculos | `app/services/` |
| **Repository** | Queries ao banco, CRUD genérico | `app/repositories/` |
| **Model** | Definição de tabelas ORM (SQLAlchemy) | `app/models/` |
| **Schema** | Schemas de entrada/saída (Pydantic) | `app/schemas/` |
| **Utils** | Funções auxiliares (validadores CPF/CNPJ, paginação) | `app/utils/` |

### 2.3 Padrão de Camadas (Frontend)

```
Page → Components → Hooks (TanStack Query) → API Client (Axios) → Backend
```

| Camada | Responsabilidade | Diretório |
|---|---|---|
| **Pages** | Composição de layout e rotas | `src/pages/` |
| **Components** | Componentes UI reutilizáveis e de domínio | `src/components/` |
| **Hooks** | Lógica de data fetching e mutação | `src/hooks/` |
| **API Client** | Configuração Axios, interceptors, tipagem | `src/lib/api.ts` |
| **Types** | Interfaces TypeScript | `src/types/` |
| **Lib** | Utilitários (formatação, masks, validadores) | `src/lib/` |

---

## 3. Backend — Detalhamento Técnico

Consultar código-fonte em `backend/app/` para implementação completa de:
- Models (SQLAlchemy 2.x com Mapped columns)
- Schemas (Pydantic v2 com field_validator e model_validator)
- Repository Pattern (BaseRepository genérico)
- Services (lógica de negócio)
- Routers (FastAPI endpoints)
- Utils (CPF/CNPJ validators, pagination, JWT security)

### 3.1 Índices de Banco de Dados

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_fazenda_razao_social ON fazenda USING gin (razao_social gin_trgm_ops);
CREATE INDEX idx_fazenda_nome_fantasia ON fazenda USING gin (nome_fantasia gin_trgm_ops);
CREATE INDEX idx_animal_fazenda_id ON animal (fazenda_id);
CREATE INDEX idx_hist_sanitario_animal_id ON historico_sanitario (animal_id);
CREATE UNIQUE INDEX idx_fazenda_cnpj_unique ON fazenda (cnpj) WHERE cnpj IS NOT NULL;
CREATE UNIQUE INDEX idx_fazenda_cpf_unique ON fazenda (cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_animal_lote ON animal (fazenda_id, lote_numero);
```

---

## 4. Segurança

| Vetor | Mitigação |
|---|---|
| SQL Injection | SQLAlchemy ORM (parameterized queries) |
| XSS | React escapa HTML por padrão + CSP headers |
| CSRF | API stateless (JWT em header, não cookie) |
| Brute Force | Rate limiting `/api/auth/login` (5 req/min/IP) |
| JWT Theft | Access token curto (15min) + refresh httpOnly |
| Mass Assignment | Pydantic schemas explicitam campos aceitos |
| Sensitive Data | Senhas com bcrypt (cost=12), nunca retornar hash |
| CORS | Whitelist explícita de origins |

---

## 5. Performance

### Backend
- Connection pooling: `pool_size=10, max_overflow=20`
- Async I/O: `asyncpg` + `async def` em todos os endpoints
- Paginação obrigatória: `MAX_PAGE_SIZE = 100`
- Índices trigram para busca texto

### Frontend
- Server-side pagination
- TanStack Query `staleTime: 30_000`
- Debounce 300ms em buscas
- Code splitting por rota (`React.lazy()`)

---

## 6. Convenções de Código

### Backend (Python)
- `snake_case` para funções/variáveis, `PascalCase` para classes
- Type hints obrigatórios, async em todos endpoints
- Line length: 120 chars, ruff para lint/format

### Frontend (TypeScript/React)
- `PascalCase` para componentes, `camelCase` para funções
- Named exports, Tailwind inline, `cn()` para condicionais

---

*Fim da Especificação Técnica — v1.0*
