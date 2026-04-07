# FarmsJose

Projeto pessoal desenvolvido para o meu pai, Jose, como ferramenta de gestão das suas atividades no campo e na fábrica.

## O que é

O FarmsJose é um sistema web completo de gestão com dois módulos principais:

- **Módulo Fazenda** — Cadastro de fazendas, animais, histórico sanitário e controle de custos por lote.
- **Módulo Fábrica** — Gestão de unidades fabris, clientes, produtos, pedidos com descontos, envio de e-mails e configurações SMTP.

Além disso, há um **painel administrativo** para gerenciamento de usuários e execução de queries SQL.

## Motivação

Meu pai cuida de fazendas e de uma pequena fábrica. Este projeto nasceu da necessidade de ter uma ferramenta simples, centralizada e acessível de qualquer lugar — mesmo offline — para organizar as informações do dia a dia sem depender de planilhas soltas ou anotações em papel.

## Funcionalidades

- Cadastro completo de fazendas e animais com histórico sanitário
- Controle de custos por fazenda e lote
- Gestão de pedidos com snapshot de preços e descontos
- Envio de e-mails de confirmação e consolidado de pedidos
- Suporte offline com sincronização automática (IndexedDB + fila de sync)
- Multi-tenant: cada usuário vê apenas seus próprios dados
- Interface em português, responsiva e com tema escuro

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | FastAPI + SQLAlchemy async |
| Banco | PostgreSQL 16 |
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + Radix UI |
| Offline | Dexie.js (IndexedDB) |
| Infra | Docker Compose |

## Rodando localmente

```bash
# Clone o repositório
git clone <repo-url>
cd FarmsJose

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Suba os containers
docker compose up -d

# Aplique as migrations
docker exec farmsjose-backend-1 alembic upgrade head
```

Acesse em `http://localhost:5173`.

## Deploy em VPS

Consulte o arquivo [DEPLOY.md](DEPLOY.md) para instruções de deploy em produção.

---

Feito com carinho para o meu pai. 🌾
