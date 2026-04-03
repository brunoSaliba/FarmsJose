## Plano: Módulo 2 — Sistema de Pedidos (Fábrica)

**TL;DR:** Adicionar 5 entidades ao backend (Cliente, Pedido, ItemPedido, EmailLog, Configuracao), integração SMTP via `fastapi-mail`, extensão do Dexie.js para offline-first, e 8 páginas React novas. Tudo segue os padrões exatos do Módulo 1 (BaseRepository, UUIDMixin + TimestampMixin, require_module, offline-api pattern).

---

### Fase 1 — Backend: Modelos + Migrations

1. Adicionar `fastapi-mail==1.4.1` em `backend/requirements.txt`
2. Adicionar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_TLS`, `EMAIL_FROM_NAME` em `backend/app/config.py` (Settings)
3. Criar `backend/app/models/cliente.py` — `Cliente(Base, UUIDMixin, TimestampMixin)` com `user_id FK`, `nome`, `email`, `telefone`, campos opcionais de endereço, `ativo=True`
4. Criar `backend/app/models/pedido.py` — enum `StatusPedido` (rascunho/confirmado/enviado/cancelado); `Pedido(Base, UUIDMixin, TimestampMixin)` com `user_id FK`, `numero` (Sequence autoincrement), `cliente_id FK`, `status`, `valor_total Numeric(12,2)`, `synced bool`; `ItemPedido(Base, UUIDMixin)` com `pedido_id FK`, `descricao`, `quantidade`, `valor_unitario`, `valor_total`
5. Criar `backend/app/models/email_log.py` — enums `TipoEmail`, `StatusEmail`; `EmailLog(Base, UUIDMixin, TimestampMixin)` com `pedido_id FK` opcional
6. Criar `backend/app/models/configuracao.py` — `Configuracao(Base, UUIDMixin, TimestampMixin)` com UniqueConstraint `(user_id, chave)`
7. Criar 4 migrations Alembic: `add_cliente`, `add_pedido_itens` (+ Sequence), `add_email_log`, `add_configuracao`

### Fase 2 — Backend: Repositories + Schemas *(depende Fase 1)*

8. `cliente_repo.py` → `BaseRepository[Cliente]` + `search(q, ativo, user_id, skip, limit)`, `has_pedidos(id)`
9. `pedido_repo.py` → `BaseRepository[Pedido]` + `search(...)`, `get_with_itens(id)`, `get_by_periodo(...)`
10. `email_log_repo.py`, `configuracao_repo.py` + método `upsert`
11. Schemas: `ClienteCreate/Update/Response`, `ItemPedidoCreate/Response`, `PedidoCreate/Update/Response` (eager itens+cliente), `EmailRelatorioRequest`, `ConfiguracaoUpsert/Response`

### Fase 3 — ClienteService + Router *(depende Fase 2)*

12. `cliente_service.py` — CRUD + `deactivate_cliente` (soft delete; bloqueia se tem pedidos ativos)
13. `routers/clientes.py` — 6 endpoints com `Depends(require_module("fabrica"))`; registrar em `main.py`

### Fase 4 — PedidoService + Router *(depende Fase 3)*

14. `pedido_service.py` — CRUD + `confirmar_pedido` (≥1 item, → CONFIRMADO + agenda e-mail), `cancelar_pedido`, `duplicar_pedido`
15. `routers/pedidos.py` — 7 endpoints; registrar em `main.py`

### Fase 5 — ConfiguracaoService + Router *(paralela com Fases 3/4)*

16. `configuracao_service.py` — `get_all`, `upsert` (INSERT ON CONFLICT UPDATE PostgreSQL)
17. `routers/configuracoes.py` — GET `/configuracoes`, PUT `/configuracoes/{chave}`

### Fase 6 — EmailService + Router *(depende Fases 4+5)*

18. `utils/email_sender.py` — `build_connection(user)`: lê config da tabela `configuracao` do user → fallback para `Settings`; retorna instância `FastMail`
19. `email_service.py` — `enviar_confirmacao`, `enviar_consolidado` (HTML f-string), `retry_pendentes`
20. `routers/email.py` — POST confirmar, POST relatorio, GET logs

### Fase 7 — Frontend: Types + API Client *(depende Fase 4)*

21. `frontend/src/types/fabrica.ts` — enums `StatusPedido`, `TipoEmail`, `StatusEmail`; interfaces `Cliente`, `Pedido`, `ItemPedido`, `EmailLog`, `Configuracao`, DTOs
22. `frontend/src/lib/fabrica-api.ts` — `clienteApi`, `pedidoApi`, `emailApi`, `configuracaoApi` com Axios

### Fase 8 — Frontend: Offline-First *(depende Fase 7)*

23. Atualizar `frontend/src/lib/db.ts` — `version(2)` + novos stores: `clientes`, `pedidos`, `itens_pedido`
24. Criar `frontend/src/lib/fabrica-offline.ts` — padrão try/catch de `offline-api.ts`; write offline → `enqueue(action)`; número de pedido offline prefixado com `OFF-`
25. Atualizar `frontend/src/lib/sync.ts` — adicionar cases `cliente`, `pedido`, `item_pedido`; após sync de pedido, atualizar `numero` no IndexedDB

### Fase 9 — Frontend: Páginas *(paralela com Fases 7/8)*

26. `DashboardFabricaPage.tsx` — cards: total clientes ativos, pedidos por status
27. `ClientesPage.tsx` + `ClienteFormPage.tsx` — tabela @tanstack/react-table + React Hook Form + Zod
28. `PedidosPage.tsx` — filtros status/data/cliente, badges coloridos
29. `PedidoFormPage.tsx` — `useFieldArray` para itens, cálculo de totais em tempo real
30. `PedidoDetailPage.tsx` — status, itens, logs de e-mail, botões confirmar/cancelar/duplicar
31. `EmailConsolidadoPage.tsx` + `ConfiguracoesAdminPage.tsx`

### Fase 10 — Frontend: Layout + Rotas *(depende Fase 9)*

32. `Layout.tsx` — mudar `disabled: false` em `fabrica`, definir `homeRoute: '/fabrica'`, adicionar `navItems` (Dashboard, Clientes, Pedidos, E-mail, Configurações)
33. `App.tsx` — adicionar 8+ rotas `/fabrica/*` com `ProtectedRoute module="fabrica"`

---

### Arquivos Modificados (existentes)

| Arquivo | O que muda |
|---------|-----------|
| `backend/requirements.txt` | `+fastapi-mail==1.4.1` |
| `backend/app/config.py` | `+SMTP_*` fields na classe `Settings` |
| `backend/app/models/__init__.py` | `+imports` dos 4 novos models |
| `backend/app/main.py` | `+include_router` para 4 routers |
| `frontend/src/lib/db.ts` | `version(2)` + 3 stores |
| `frontend/src/lib/sync.ts` | `+cases` cliente / pedido |
| `frontend/src/components/layout/Layout.tsx` | ativar módulo `fabrica` |
| `frontend/src/App.tsx` | `+rotas` da Fábrica |

---

### Verificação

1. `docker exec farmsjose-backend-1 alembic upgrade head` — 4 migrações sem erro
2. `GET /api/v1/clientes` com token sem módulo `fabrica` → **403**
3. `GET /api/v1/clientes` com módulo `fabrica` → **200**
4. Fluxo completo: criar pedido → confirmar → `EmailLog.status == "enviado"`
5. Offline: criar pedido desconectado → religar → sync → `numero` real no IndexedDB
6. `npm run build` sem erros TypeScript

---

### Fora do Escopo

- PWA / Service Worker install prompt
- Recuperação de senha por e-mail
- Rate limiting no login
- Criptografia do IndexedDB
