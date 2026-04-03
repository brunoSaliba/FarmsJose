# FarmsJose — Deploy

## Arquitetura de Producao

```
[Browser] → [Caddy (HTTPS)] → [Frontend (Nginx)] → /api/* → [Backend (FastAPI)] → [PostgreSQL]
                                                   → /*    → static files (React SPA)
```

- **Caddy**: Reverse proxy com HTTPS automatico (Let's Encrypt)
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

Acesse `https://SEU_DOMINIO` (Caddy gera SSL automaticamente).

---

## 5. Deploy em VPS (Ubuntu/Debian)

### 5.1 Preparar o Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Sair e reconectar para o grupo docker funcionar

# Instalar Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Abrir portas no firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 5.2 Clonar e Configurar

```bash
git clone https://github.com/SEU_USUARIO/FarmsJose.git
cd FarmsJose

# Criar arquivo de configuracao
cp .env.example .env
nano .env
```

Edite o `.env` com os valores de producao:

```env
DOMAIN=app.seudominio.com.br
POSTGRES_PASSWORD=senha-forte-do-banco
SECRET_KEY=cole-aqui-resultado-de-openssl-rand-hex-32
COOKIE_SECURE=true
ADMIN_EMAIL=admin@farmsjose.com
ADMIN_PASSWORD=senha-forte-do-admin
```

### 5.3 Configurar DNS

No painel do seu provedor de dominio, crie um registro **A**:

| Tipo | Nome | Valor |
|------|------|-------|
| A | `app` (ou `@`) | IP da sua VPS |

> Aguarde a propagacao DNS (pode levar alguns minutos).

### 5.4 Subir a Aplicacao

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

O Caddy obtem o certificado SSL automaticamente na primeira requisicao.

### 5.5 Verificar Logs

```bash
# Ver se o backend iniciou e migrations rodaram
docker compose -f docker-compose.prod.yml logs backend

# Ver se o Caddy obteve o certificado SSL
docker compose -f docker-compose.prod.yml logs caddy

# Ver todos os servicos
docker compose -f docker-compose.prod.yml ps
```

### 5.6 Atualizar Apos Mudancas

```bash
cd FarmsJose
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### 5.7 Backup do Banco

```bash
# Criar backup
docker compose -f docker-compose.prod.yml exec db pg_dump -U farmsjose farmsjose > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_20260403.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U farmsjose farmsjose
```

---

## 5. Desenvolvimento Local

Para desenvolvimento com hot reload e debugpy:

```bash
docker compose up --build
```

Acesse `http://localhost:5173`. Debug via porta `5678`.

---

## 7. Checklist Pre-Deploy

- [ ] `DOMAIN` configurado (ex: `app.farmsjose.com.br`)
- [ ] DNS apontando para o IP da VPS (registro A)
- [ ] `SECRET_KEY` gerada com `openssl rand -hex 32`
- [ ] `POSTGRES_PASSWORD` forte
- [ ] `ADMIN_PASSWORD` forte (nao usar `admin123`)
- [ ] `COOKIE_SECURE=true`
- [ ] `DEBUG=false`
- [ ] Portas 80 e 443 abertas no firewall

---

## 8. Apos Deploy

1. Acesse `https://SEU_DOMINIO` e faca login com `ADMIN_EMAIL` / `ADMIN_PASSWORD`
2. Verifique os logs do backend para confirmar que migrations rodaram
3. Crie novos usuarios pelo painel Admin
4. Altere a senha do admin pelo perfil
4. Altere a senha do admin pelo perfil
