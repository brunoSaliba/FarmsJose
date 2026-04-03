# FarmsJose — Deploy no Railway

## Arquitetura de Producao

```
[Browser] → [Frontend (Nginx)] → /api/* → [Backend (FastAPI)] → [PostgreSQL]
                                → /*    → static files (React SPA)
```

- **Frontend**: Build estatico React servido por Nginx, com proxy reverso para o backend
- **Backend**: FastAPI com Alembic migrations automaticas no startup
- **Database**: PostgreSQL 16

---

## 1. Preparar o Repositorio

```bash
cd FarmsJose
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/FarmsJose.git
git push -u origin main
```

---

## 2. Criar Projeto no Railway

1. Acesse [railway.app](https://railway.app) e faca login com GitHub
2. Clique em **New Project**

### 2.1 Adicionar PostgreSQL

1. No projeto, clique **New** → **Database** → **PostgreSQL**
2. O Railway cria o database automaticamente
3. Copie a `DATABASE_URL` (aba **Variables** do servico PostgreSQL)

### 2.2 Deploy do Backend

1. **New** → **GitHub Repo** → selecione `FarmsJose`
2. Em **Settings**:
   - **Root Directory**: `backend`
   - **Builder**: `Dockerfile`
3. Em **Variables**, adicione:

| Variavel | Valor |
|----------|-------|
| `DATABASE_URL` | Cole a URL do PostgreSQL (o Railway aceita o formato `postgres://`, o app converte automaticamente) |
| `SECRET_KEY` | Gere com `openssl rand -hex 32` |
| `COOKIE_SECURE` | `true` |
| `ADMIN_EMAIL` | `admin@farmsjose.com` |
| `ADMIN_PASSWORD` | Senha forte para o admin |
| `CORS_ORIGINS` | `["https://SEU-FRONTEND.up.railway.app"]` |
| `PORT` | `8001` |

> **Nota**: O Railway seta `PORT` automaticamente, mas definir `8001` garante consistencia com o proxy do frontend.

### 2.3 Deploy do Frontend

1. **New** → **GitHub Repo** → selecione `FarmsJose` (mesmo repo)
2. Em **Settings**:
   - **Root Directory**: `frontend`
   - **Builder**: `Dockerfile`
3. Em **Variables**, adicione:

| Variavel | Valor |
|----------|-------|
| `BACKEND_URL` | `http://backend.railway.internal:8001` |
| `PORT` | O Railway define automaticamente |

> **Importante**: Use a URL **interna** do Railway (`*.railway.internal`) para o `BACKEND_URL`. Isso usa a rede privada do Railway (mais rapido, sem custo de egress).

### 2.4 Gerar Dominio Publico

1. No servico **frontend**, va em **Settings** → **Networking** → **Generate Domain**
2. Isso gera uma URL como `farmsjose.up.railway.app`
3. O backend **NAO** precisa de dominio publico (acesso via rede interna pelo proxy nginx)

### 2.5 (Opcional) Dominio Custom

1. No servico frontend, em **Settings** → **Networking** → **Custom Domain**
2. Adicione seu dominio (ex: `app.farmsjose.com.br`)
3. Configure o DNS conforme instrucoes do Railway (CNAME record)

---

## 3. Variaveis de Ambiente

### Obrigatorias

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL do PostgreSQL | `postgres://user:pass@host:5432/db` |
| `SECRET_KEY` | Chave JWT (min 32 chars) | `openssl rand -hex 32` |
| `COOKIE_SECURE` | `true` para HTTPS | `true` |
| `ADMIN_PASSWORD` | Senha do admin seed | Senha forte |

### Opcionais

| Variavel | Default | Descricao |
|----------|---------|-----------|
| `ADMIN_EMAIL` | `admin@farmsjose.com` | Email do admin |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Origens CORS permitidas |
| `SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP |
| `SMTP_PORT` | `587` | Porta SMTP |
| `SMTP_USER` | | Usuario SMTP |
| `SMTP_PASSWORD` | | Senha SMTP |
| `DEBUG` | `false` | Modo debug (logs SQL) |

---

## 4. Teste Local de Producao

Para testar o build de producao localmente:

```bash
# Crie um .env com seus valores de producao
cp .env.example .env
# Edite o .env

# Suba com o compose de producao
docker compose -f docker-compose.prod.yml up --build
```

Acesse `http://localhost` (porta 80).

---

## 5. Desenvolvimento Local

Para desenvolvimento com hot reload e debugpy:

```bash
docker compose up --build
```

Acesse `http://localhost:5173`. Debug via porta `5678`.

---

## 6. Checklist Pre-Deploy

- [ ] `SECRET_KEY` gerada com `openssl rand -hex 32`
- [ ] `ADMIN_PASSWORD` forte (nao usar `admin123`)
- [ ] `COOKIE_SECURE=true`
- [ ] `CORS_ORIGINS` aponta para o dominio do frontend
- [ ] `DEBUG=false`
- [ ] Banco de dados PostgreSQL provisionado no Railway
- [ ] `BACKEND_URL` do frontend aponta para a URL interna do backend

---

## 7. Apos Deploy

1. Acesse a URL do frontend e faca login com `ADMIN_EMAIL` / `ADMIN_PASSWORD`
2. Verifique os logs do backend no Railway para confirmar que migrations rodaram
3. Crie novos usuarios pelo painel Admin
4. Altere a senha do admin pelo perfil
