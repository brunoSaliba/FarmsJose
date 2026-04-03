# FarmsJose — GitHub Copilot Instructions

## Visão Geral do Projeto

Sistema de gestão de fazendas com três módulos:
- **Módulo 1 — Animais** (`modulos: ["animais"]`): cadastro de fazendas, animais, histórico sanitário, custos. **IMPLEMENTADO.**
- **Módulo 2 — Fábrica/Pedidos** (`modulos: ["fabrica"]`): unidades fabris, clientes, produtos (com SKU), pedidos (com descontos e snapshots), itens, e-mail, configurações SMTP. **IMPLEMENTADO.**
- **Módulo Admin** (`is_admin: true`): dashboard administrativo, gerenciamento de usuários, query SQL. **IMPLEMENTADO.**

---

## Stack

| Camada | Tecnologia | Versão exata |
|--------|-----------|-------------|
| Backend | FastAPI | 0.115.6 |
| ORM | SQLAlchemy async | 2.0.36 |
| Driver DB | asyncpg | 0.30.0 |
| Migrations | Alembic | 1.14.1 |
| Validação | Pydantic v2 + pydantic-settings | 2.10.4 / 2.7.1 |
| Auth | python-jose (JWT HS256) + passlib/bcrypt | 3.3.0 / 1.7.4 |
| Email | fastapi-mail | 1.4.1 |
| Frontend | React 18 + TypeScript | 18.3.1 / 5.6.3 |
| Build | Vite | 6 |
| State/Fetch | TanStack Query | 5.62.7 |
| Roteamento | React Router | 6.28.1 |
| Forms | React Hook Form + Zod | 7.54.2 / 3.24.1 |
| HTTP client | Axios | 1.7.9 |
| Offline | Dexie.js v4 (IndexedDB) | 4.4.2 |
| UI | Tailwind CSS 3 + Lucide React | 3.4.17 / 0.468.0 |
| Tabelas | @tanstack/react-table | 8.20.6 |
| Componentes | Radix UI (dialog, dropdown-menu, label, select, slot, toast) | latest |
| Banco | PostgreSQL 16-alpine | — |
| Infra | Docker Compose | — |

---

## Arquitetura Backend

### Padrão de camadas (imutável)
```
Router (HTTP) → Service (Business Logic) → Repository (Data Access) → Model (ORM)
```

### Modelos — `backend/app/models/`
Todos herdam `Base, UUIDMixin, TimestampMixin` de `app/models/base.py`:
```python
class Entidade(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "entidade"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"), index=True)
```
- `UUIDMixin`: `id UUID PK` com `default=uuid.uuid4, server_default=func.gen_random_uuid()`
- `TimestampMixin`: `created_at`, `updated_at` com `server_default=func.now(), onupdate=func.now()`
- Sequências auto-incremento: usar `Sequence("nome_seq")` com `server_default=seq.next_value()` (ver `fazenda.py` → `fazenda_id_sistema_seq`)
- **Todos os recursos de topo têm `user_id FK → user.id`** para isolamento multi-tenant

### Repositories — `backend/app/repositories/`
Herdam `BaseRepository[ModelType]` de `app/repositories/base.py`:
```python
class ClienteRepository(BaseRepository[Cliente]):
    def __init__(self, session: AsyncSession):
        super().__init__(Cliente, session)
    # Métodos extras: search, has_pedidos, upsert, etc.
```
- Métodos base disponíveis: `get_by_id`, `get_all(skip, limit, filters, order_by)`, `create(dict)`, `update(obj, dict)`, `delete(obj)`
- Recebem `AsyncSession` no `__init__`

### Schemas — `backend/app/schemas/`
Padrão obrigatório por entidade:
```python
class EntidadeCreate(BaseModel): ...
class EntidadeUpdate(BaseModel):   # todos os campos Optional
    campo: str | None = None
class EntidadeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # obrigatório
```

### Services — `backend/app/services/`
Recebem `AsyncSession`, instanciam seus próprios repos:
```python
class ClienteService:
    def __init__(self, session: AsyncSession):
        self.repo = ClienteRepository(session)

    async def get_cliente(self, cliente_id: UUID, user: User):
        obj = await self.repo.get_by_id(cliente_id)
        if not obj or (not user.is_admin and obj.user_id != user.id):
            raise HTTPException(status_code=404, detail="Nao encontrado")
        return obj

    async def _get_owned_cliente(self, cliente_id: UUID, user: User):
        obj = await self.repo.get_by_id(cliente_id)
        if not obj or obj.user_id != user.id:
            raise HTTPException(status_code=404, detail="Nao encontrado")
        return obj
```
- Admin pode **visualizar** dados de qualquer usuário, mas **não pode modificar nem excluir**
- Leitura (list/get): `if not obj or (not user.is_admin and obj.user_id != user.id)` — admin bypassa
- Listagens de leitura: `user_id_filter = None if user.is_admin else user.id`
- Escrita (create/update/delete): `if not obj or obj.user_id != user.id` — sem bypass
- Métodos internos `_get_owned_*` são usados por operações de escrita

### Routers — `backend/app/routers/`
```python
router = APIRouter(prefix="/clientes", tags=["Clientes"])

@router.get("", response_model=PaginatedResponse[ClienteResponse])
async def list_clientes(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_module("fabrica")),  # ou get_current_user
):
    service = ClienteService(db)
    return await service.list_clientes(user=user, ...)
```
- Módulo 1 usa `Depends(get_current_user)`
- Módulo 2 usa `Depends(require_module("fabrica"))`
- Registrar em `backend/app/main.py` via `app.include_router(router, prefix="/api/v1")`

### Auth e Multi-tenancy — `backend/app/deps.py`
```python
get_current_user(credentials, db) -> User   # Bearer JWT → User (401 se inválido)
get_admin_user(user) -> User                # 403 se não admin
require_module("fabrica") -> dependency     # 403 se user não tem "fabrica" em modulos (admin passa direto)
```
- JWT: HS256, access_token 15min, refresh_token 7 dias
- `user.modulos: list[str]` — ex: `["animais"]`, `["animais", "fabrica"]`
- `user.is_admin: bool` — acesso ao módulo Admin + leitura de dados de todos os usuários; **NÃO pode modificar/excluir dados de outros**

### Config — `backend/app/config.py`
```python
class Settings(BaseSettings):
    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}
    DATABASE_URL: str = "postgresql+asyncpg://..."
    SECRET_KEY: str = "..."
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    EMAIL_FROM_NAME: str = "FarmsJose"
    DEFAULT_PAGE_SIZE: int = 10
    MAX_PAGE_SIZE: int = 100
```

---

## Arquitetura Frontend

### Padrão de camadas
```
Page → Components → Hooks (TanStack Query) → API Client (Axios) → Backend
                                           → Offline API (Dexie fallback)
```

### API Client — `frontend/src/lib/api.ts`
- Instância Axios com `baseURL: '/api/v1'`
- Interceptor de request: injeta `Bearer ${localStorage.getItem('access_token')}`
- Interceptor de response: 401 não-login → limpa tokens e redireciona `/login`
- Exporta objetos por domínio: `authApi`, `fazendaApi`, `animalApi`, `historicoApi`, `custoApi`
- Módulo 2 em `frontend/src/lib/fabrica-api.ts`: `clienteApi`, `pedidoApi`, `emailApi`, `configuracaoApi`

### Types — `frontend/src/types/`
- `index.ts`: tipos do Módulo 1 (`Fazenda`, `Animal`, `HistoricoSanitario`, `UserInfo`, `PaginatedResponse<T>`, etc.)
- `fabrica.ts`: tipos do Módulo 2 (`Cliente`, `Pedido`, `ItemPedido`, `EmailLog`, `Configuracao`, enums `StatusPedido`, `TipoEmail`, `StatusEmail`)

### Offline-First — Dexie.js v4

**Schema em `frontend/src/lib/db.ts` (versão 4):**
```typescript
this.version(1).stores({
  fazendas:  'id, id_sistema, nome_fantasia, cnpj, estado, cidade',
  animais:   'id, fazenda_id, lote_numero, sexo, codigo_identificacao',
  historicos:'id, animal_id',
  syncQueue: '++id, entity, action, entityId, createdAt',
});

this.version(2).stores({
  fazendas:  'id, id_sistema, nome_fantasia, cnpj, estado, cidade',
  animais:   'id, fazenda_id, lote_numero, sexo, codigo_identificacao',
  historicos:'id, animal_id',
  clientes:  'id, user_id, nome, email, ativo',
  pedidos:   'id, user_id, numero, cliente_id, status, created_at',
  syncQueue: '++id, entity, action, entityId, createdAt',
});

this.version(3).stores({
  fazendas:  'id, id_sistema, nome_fantasia, cnpj, estado, cidade',
  animais:   'id, fazenda_id, lote_numero, sexo, codigo_identificacao',
  historicos:'id, animal_id',
  clientes:  'id, user_id, nome, email, ativo',
  pedidos:   'id, user_id, numero, cliente_id, status, created_at',
  produtos:  'id, user_id, nome, ativo',
  syncQueue: '++id, entity, action, entityId, createdAt',
});

this.version(4).stores({
  fazendas:  'id, id_sistema, nome_fantasia, cnpj, estado, cidade',
  animais:   'id, fazenda_id, lote_numero, sexo, codigo_identificacao',
  historicos:'id, animal_id',
  clientes:  'id, user_id, nome, email, ativo',
  pedidos:   'id, user_id, numero, cliente_id, status, created_at',
  produtos:  'id, user_id, nome, ativo, fabrica_id',
  fabricas:  'id, user_id, nome, ativo',
  syncQueue: '++id, entity, action, entityId, createdAt',
});
```

**SyncAction interface:**
```typescript
interface SyncAction {
  id?: number;
  entity: 'fazenda' | 'animal' | 'historico' | 'cliente' | 'pedido' | 'produto' | 'fabrica';
  action: 'create' | 'update' | 'delete';
  entityId: string;
  parentId?: string;
  payload?: Record<string, unknown>;
  createdAt: number;
}
```

**Sync engine — `frontend/src/lib/sync.ts`:**
- `processAction(action)`: switch em `action.entity` → faz chamada API → atualiza IndexedDB
- Entities suportadas: `fazenda`, `animal`, `historico`, `cliente`, `pedido`, `produto`, `fabrica`
- Temp ID resolution: após criar no servidor, atualiza `id` local + corrige FK refs em registros filhos e na fila
- FIFO: para no primeiro erro de rede (4xx descarta, 5xx/rede quebra o loop)

**Padrão de offline-api:**
- `frontend/src/lib/offline-api.ts`: `offlineFazendaApi`, `offlineAnimalApi`, `offlineHistoricoApi`
- `frontend/src/lib/fabrica-offline.ts`: `offlineFabricaApi`, `offlineClienteApi`, `offlineProdutoApi`, `offlinePedidoApi`
- Padrão: tenta chamada API → grava no IndexedDB via `bulkPut` → fallback para leitura local
- Creates offline: gera `tempId = crypto.randomUUID()`, grava localmente, enfileira sync
- Pedidos offline: prefixar número com `'OFF-'` enquanto não sincronizado

### Layout e Módulos — `frontend/src/components/layout/Layout.tsx`

```typescript
const MODULES: Module[] = [
  {
    key: 'animais',
    label: 'Fazenda', subtitle: 'Modulo 1',
    icon: Beef,
    homeRoute: '/',
    requiresModule: 'animais',
    navItems: [
      { path: '/', label: 'Inicio', icon: LayoutDashboard, exact: true },
      { path: '/fazendas', label: 'Fazendas', icon: Home },
      { path: '/animais', label: 'Animais', icon: Beef },
      { path: '/resumo', label: 'Resumo', icon: BarChart3 },
    ],
  },
  {
    key: 'fabrica',
    label: 'Fabrica', subtitle: 'Modulo 2',
    icon: Factory,
    homeRoute: '/fabrica',
    requiresModule: 'fabrica',
    navItems: [
      { path: '/fabrica', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { path: '/fabrica/clientes', label: 'Clientes', icon: Users },
      { path: '/fabrica/produtos', label: 'Produtos', icon: Package },
      { path: '/fabrica/unidades', label: 'Fabricas', icon: Building2 },
      { path: '/fabrica/pedidos', label: 'Pedidos', icon: ShoppingCart },
      { path: '/fabrica/email', label: 'Email', icon: Mail },
      { path: '/fabrica/configuracoes', label: 'Config', icon: Wrench },
    ],
  },
  {
    key: 'admin',
    label: 'Admin', subtitle: 'Sistema',
    icon: Shield,
    homeRoute: '/admin',
    requiresModule: null,
    adminOnly: true,  // visível apenas para is_admin
    navItems: [
      { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { path: '/admin/usuarios', label: 'Usuarios', icon: Users },
      { path: '/admin/query', label: 'SQL', icon: Terminal },
    ],
  },
];
```
- `adminOnly: true` → módulo visível apenas para `user.is_admin`
- `disabled: true` → exibe "Em breve" a todos (não usado atualmente)
- Módulo ativo determinado por qual `navItems.path` bate com `location.pathname`

### Rotas — `frontend/src/App.tsx`
```tsx
function ProtectedRoute({ children, module }: { children: ReactNode; module?: string }) {
  const { user, loading, hasModule } = useAuth();
  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (module && !hasModule(module)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```
- Rotas Módulo 1: `/`, `/fazendas`, `/animais`, `/resumo`, `/configuracao`
- Rotas Módulo 2: `/fabrica`, `/fabrica/clientes`, `/fabrica/produtos`, `/fabrica/unidades`, `/fabrica/pedidos`, `/fabrica/email`, `/fabrica/configuracoes` — protegidas com `<ProtectedRoute module="fabrica">`
- Rotas Admin: `/admin`, `/admin/usuarios`, `/admin/query` — protegidas com verificação `is_admin`

---

## O que está IMPLEMENTADO

### Backend
| Camada | Arquivos |
|--------|----------|
| `models/` | base, user, fazenda, animal, historico_sanitario, custo_fazenda, fabrica_unidade, cliente, produto, pedido, email_log, configuracao |
| `repositories/` | base, user_repo, fazenda_repo, animal_repo, historico_sanitario_repo, custo_fazenda_repo, fabrica_unidade_repo, cliente_repo, produto_repo, pedido_repo, email_log_repo, configuracao_repo |
| `schemas/` | user, fazenda, animal, historico_sanitario, custo_fazenda, fabrica_unidade, cliente, produto, pedido, email_log, configuracao, common |
| `services/` | user_service, fazenda_service, animal_service, custo_service, fabrica_unidade_service, cliente_service, produto_service, pedido_service, email_service, configuracao_service |
| `routers/` | auth, fazendas, animais, historico_sanitario, custos, fabricas, clientes, produtos, pedidos, email, configuracoes, admin |
| `utils/` | security, pagination, validators, email_sender |
| `deps.py` | get_current_user, get_admin_user, require_module |
| `config.py` | Settings com SMTP fields |
| `main.py` | lifespan, seed_admin, CORS, todos os routers registrados |
| Alembic | initial_schema, add_user_id_to_fazenda, add_modulo_fabrica, add_fabrica_unidade_and_improvements |

### Frontend
| Camada | Arquivos |
|--------|----------|
| `lib/api.ts` | authApi, fazendaApi, animalApi, historicoApi, custoApi |
| `lib/fabrica-api.ts` | fabricaApi, clienteApi, produtoApi, pedidoApi, emailApi, configuracaoApi |
| `lib/db.ts` | Dexie v4 — fazendas, animais, historicos, clientes, pedidos, produtos, fabricas, syncQueue |
| `lib/sync.ts` | processAction para fazenda, animal, historico, cliente, pedido, produto, fabrica |
| `lib/offline-api.ts` | offlineFazendaApi, offlineAnimalApi, offlineHistoricoApi |
| `lib/fabrica-offline.ts` | offlineFabricaApi, offlineClienteApi, offlineProdutoApi, offlinePedidoApi |
| `hooks/` | useAuth, useOffline (useOnlineStatus, usePendingSync, useAutoSync) |
| `types/index.ts` | Fazenda, Animal, HistoricoSanitario, UserInfo, PaginatedResponse |
| `types/fabrica.ts` | Cliente, Produto, Pedido, ItemPedido, EmailLog, Configuracao, enums |
| `pages/` (M1) | LoginPage, HomePage, FazendasPage, FazendaFormPage, AnimaisPage, AnimalFormPage, ResumoPage, ConfiguracaoPage |
| `pages/fabrica/` (M2) | DashboardFabricaPage, FabricasPage, FabricaFormPage, ClientesPage, ClienteFormPage, ProdutosPage, ProdutoFormPage, PedidosPage, PedidoFormPage, PedidoDetailPage, PedidoEditPage, EmailConsolidadoPage, ConfiguracoesAdminPage |
| `pages/admin/` | AdminDashboardPage, UsuariosPage, QueryRunnerPage |
| `Layout.tsx` | sidebar com 3 módulos: Animais, Fabrica, Admin |
| `App.tsx` | ProtectedRoute, rotas M1 + M2 + Admin |

---

## Convenções de Código

### Backend (Python)
- `snake_case` para funções/variáveis, `PascalCase` para classes
- Type hints obrigatórios em todos os métodos
- `async def` em todos os endpoints e métodos de service/repository
- Strings de mensagem de erro sem acentos (ex: `"Nao encontrado"`, não `"Não encontrado"`)
- Linting: `ruff` (line length 120)

### Frontend (TypeScript/React)
- `PascalCase` para componentes, `camelCase` para funções e variáveis
- Named exports em todos os arquivos
- Tailwind inline para estilos; `cn()` para condicionais
- TanStack Query para server state; Zod + React Hook Form para formulários
- Importações com alias `@/` (ex: `import { db } from '@/lib/db'`)

---

## Infra e Comandos Úteis

```bash
# Migrations
docker exec farmsjose-backend-1 alembic upgrade head
docker exec farmsjose-backend-1 alembic revision --autogenerate -m "add_cliente"

# Logs
docker logs farmsjose-backend-1 -f
docker logs farmsjose-frontend-1 -f

# Rebuild
docker compose build backend
docker compose up -d
```

Portas: backend `8001`, frontend `5173`, postgres `5432`, debugpy `5678`

---

## Princípios SOLID

Todo código deve seguir os princípios SOLID:

| Princípio | Aplicação no projeto |
|-----------|---------------------|
| **S** — Single Responsibility | Cada classe/módulo tem uma única responsabilidade: Router (HTTP), Service (lógica de negócio), Repository (acesso a dados), Model (ORM) |
| **O** — Open/Closed | Extensível via novos Services/Repos sem modificar os existentes; `BaseRepository` genérico permite extensão sem alteração |
| **L** — Liskov Substitution | Repositórios especializados substituem `BaseRepository` sem quebrar contratos; schemas `Create`/`Update`/`Response` mantêm consistência |
| **I** — Interface Segregation | Schemas separados por operação (`Create`, `Update`, `Response`); dependências injetadas são específicas (`AsyncSession`, não o engine inteiro) |
| **D** — Dependency Inversion | Services dependem de abstrações (repos injetados via construtor); Routers recebem dependências via `Depends()` do FastAPI |

---

## Segurança

Seguir as diretrizes OWASP Top 10. Toda alteração deve considerar os vetores abaixo:

| Vetor | Mitigação |
|-------|----------|
| SQL Injection | SQLAlchemy ORM (parameterized queries) — nunca interpolar strings em queries |
| CSRF | API stateless — JWT em Authorization header, não cookie |
| Mass Assignment | Pydantic schemas explicitam campos aceitos — nunca usar `**request.dict()` direto no model |
| Senhas | bcrypt (passlib, cost=12) — nunca retornar hash em responses |
| CORS | `CORS_ORIGINS` whitelist explícita em Settings |
| Auth | Bearer JWT — 401 token inválido, 403 sem permissão de módulo |
| Dados SMTP | Armazenados em tabela `configuracao` por usuário — transmissão só via HTTPS |
| XSS | React escapa output por padrão — nunca usar `dangerouslySetInnerHTML` sem sanitização |
| Broken Access Control | Admin pode visualizar dados de qualquer usuário mas não modificar/excluir; operações de escrita usam `_get_owned_*` com verificação estrita de `user_id` |
| Security Misconfiguration | `SECRET_KEY` e credenciais via variáveis de ambiente (.env), nunca hardcoded |
| Logging | Nunca logar tokens, senhas ou dados sensíveis |

## Internacionalizacao (i18n)
- Ao adicionar qualquer texto novo visivel na UI do frontend, nao hardcode a string no componente.
- Sempre adicione a chave correspondente em rontend/src/i18n/locales/pt-BR/translation.json e rontend/src/i18n/locales/en/translation.json.
- Consuma textos de interface com eact-i18next (useTranslation, 	(...)) e mantenha as keys organizadas por contexto/pagina.
- Placeholders, labels, botoes, mensagens de erro, alerts, confirmacoes e titulos tambem devem vir dos resource files.

