# Especificação Funcional — Sistema de Pedidos Web (Offline-First)

**Projeto:** Sistema de Retirada de Pedidos  
**Versão:** 1.0  
**Data:** 29/03/2026  

---

## 1. Visão Geral

Sistema web progressivo (PWA) para retirada de pedidos, com suporte a funcionamento **offline**. Permite cadastrar clientes, registrar pedidos, enviar e-mails de confirmação para clientes e relatórios consolidados de pedidos para a empresa.

---

## 2. Objetivos

| # | Objetivo |
|---|----------|
| O1 | Permitir o cadastro e gestão de clientes |
| O2 | Permitir o cadastro e gestão de pedidos vinculados a clientes |
| O3 | Funcionar offline, sincronizando dados quando houver conexão |
| O4 | Enviar e-mail de confirmação de pedido para o cliente |
| O5 | Enviar e-mail consolidado com todos os pedidos para a empresa |

---

## 3. Personas / Atores

| Ator | Descrição |
|------|-----------|
| **Operador** | Usuário que cadastra clientes e registra pedidos (vendedor, atendente) |
| **Administrador** | Usuário com acesso total: gestão de usuários, configurações e relatórios |
| **Cliente** | Pessoa que realiza o pedido (recebe e-mail de confirmação) |
| **Empresa** | Destinatário do e-mail consolidado de pedidos |

---

## 4. Requisitos Funcionais

### 4.1 Módulo de Autenticação

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-01 | O sistema deve permitir login com e-mail e senha | Alta |
| RF-02 | O sistema deve manter a sessão ativa mesmo offline | Alta |
| RF-03 | O sistema deve permitir recuperação de senha por e-mail | Média |
| RF-04 | O administrador pode cadastrar, editar e desativar operadores | Média |

### 4.2 Módulo de Clientes

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-10 | O sistema deve permitir cadastrar um novo cliente | Alta |
| RF-11 | O sistema deve permitir editar dados de um cliente | Alta |
| RF-12 | O sistema deve permitir buscar clientes por nome, e-mail ou telefone | Alta |
| RF-13 | O sistema deve permitir listar todos os clientes cadastrados | Alta |
| RF-14 | O sistema deve permitir desativar (soft delete) um cliente | Média |
| RF-15 | O sistema deve permitir visualizar o histórico de pedidos de um cliente | Média |

**Dados do Cliente:**

| Campo | Tipo | Obrigatório | Observações |
|-------|------|:-----------:|-------------|
| Nome completo | Texto (150) | Sim | — |
| E-mail | Texto (254) | Sim | Validação de formato |
| Telefone | Texto (20) | Sim | Máscara (XX) XXXXX-XXXX |
| CPF/CNPJ | Texto (18) | Não | Validação de dígitos |
| Endereço | Texto (300) | Não | Rua, número, complemento |
| Cidade | Texto (100) | Não | — |
| Estado | Texto (2) | Não | UF |
| CEP | Texto (9) | Não | Máscara XXXXX-XXX |
| Observações | Texto (500) | Não | Notas internas sobre o cliente |

### 4.3 Módulo de Pedidos

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-20 | O sistema deve permitir criar um novo pedido vinculado a um cliente | Alta |
| RF-21 | O sistema deve permitir adicionar múltiplos itens a um pedido | Alta |
| RF-22 | O sistema deve calcular automaticamente o valor total do pedido | Alta |
| RF-23 | O sistema deve permitir editar um pedido com status "Rascunho" | Alta |
| RF-24 | O sistema deve permitir cancelar um pedido | Alta |
| RF-25 | O sistema deve permitir buscar pedidos por cliente, data ou status | Alta |
| RF-26 | O sistema deve permitir listar todos os pedidos com filtros e paginação | Alta |
| RF-27 | O sistema deve registrar a data/hora de criação e última alteração | Alta |
| RF-28 | O sistema deve permitir duplicar um pedido existente | Baixa |

**Dados do Pedido:**

| Campo | Tipo | Obrigatório | Observações |
|-------|------|:-----------:|-------------|
| Número do pedido | Auto-incremental | Sim | Gerado pelo sistema |
| Cliente | Referência | Sim | Vínculo com cadastro de cliente |
| Data do pedido | Data/Hora | Sim | Preenchido automaticamente |
| Status | Enum | Sim | Rascunho, Confirmado, Enviado, Cancelado |
| Observações | Texto (500) | Não | Notas sobre o pedido |
| Valor total | Decimal | Sim | Calculado automaticamente |

**Dados do Item do Pedido:**

| Campo | Tipo | Obrigatório | Observações |
|-------|------|:-----------:|-------------|
| Descrição do produto | Texto (200) | Sim | Nome/descrição do item |
| Quantidade | Inteiro | Sim | Mínimo: 1 |
| Valor unitário | Decimal (10,2) | Sim | Em reais (R$) |
| Valor total do item | Decimal (10,2) | Sim | Quantidade × Valor unitário |

**Fluxo de Status do Pedido:**

```
[Rascunho] ──→ [Confirmado] ──→ [Enviado]
     │               │
     └──→ [Cancelado] ←──┘
```

### 4.4 Módulo de E-mail

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-30 | O sistema deve enviar e-mail de confirmação para o cliente ao confirmar um pedido | Alta |
| RF-31 | O sistema deve permitir enviar e-mail consolidado de pedidos para a empresa | Alta |
| RF-32 | O e-mail para o cliente deve conter: número do pedido, itens, quantidades, valores e total | Alta |
| RF-33 | O e-mail consolidado para a empresa deve conter todos os pedidos de um período selecionável | Alta |
| RF-34 | Os e-mails pendentes (criados offline) devem ser enfileirados e enviados quando houver conexão | Alta |
| RF-35 | O sistema deve registrar log de envio de e-mails (sucesso/falha) | Média |
| RF-36 | O administrador deve poder configurar o e-mail da empresa destinatária | Média |

**Modelo de E-mail — Confirmação ao Cliente:**
- Assunto: `Pedido #[NÚMERO] — Confirmação`
- Corpo: saudação, número do pedido, tabela de itens (descrição, qtd, valor), valor total, observações

**Modelo de E-mail — Consolidado para a Empresa:**
- Assunto: `Relatório de Pedidos — [DATA INÍCIO] a [DATA FIM]`
- Corpo: resumo quantitativo, lista de pedidos com cliente, itens e valores, total geral do período

### 4.5 Módulo Offline (PWA)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-40 | O sistema deve funcionar sem conexão à internet para cadastro de clientes e pedidos | Alta |
| RF-41 | Os dados criados offline devem ser armazenados localmente (IndexedDB) | Alta |
| RF-42 | Ao restabelecer conexão, os dados locais devem ser sincronizados com o servidor | Alta |
| RF-43 | O sistema deve exibir indicador visual de status online/offline | Alta |
| RF-44 | O sistema deve tratar conflitos de sincronização (último a gravar vence ou alerta ao usuário) | Média |
| RF-45 | E-mails gerados offline devem ser enfileirados e disparados na sincronização | Alta |

### 4.6 Módulo de Configurações (Admin)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-50 | O administrador deve poder configurar o e-mail remetente (SMTP) | Média |
| RF-51 | O administrador deve poder configurar o e-mail da empresa destinatária | Média |
| RF-52 | O administrador deve poder gerenciar usuários (criar, editar, desativar) | Média |
| RF-53 | O administrador deve poder visualizar logs de sincronização e envio de e-mails | Baixa |

---

## 5. Requisitos Não Funcionais

| ID | Requisito | Categoria |
|----|-----------|-----------|
| RNF-01 | O sistema deve ser uma PWA instalável em dispositivos móveis e desktop | Usabilidade |
| RNF-02 | O sistema deve ser responsivo (mobile-first) | Usabilidade |
| RNF-03 | O tempo de carregamento inicial deve ser inferior a 3 segundos (com cache) | Performance |
| RNF-04 | Os dados locais devem ser persistidos em IndexedDB com criptografia básica | Segurança |
| RNF-05 | As senhas devem ser armazenadas com hash bcrypt (custo ≥ 12) | Segurança |
| RNF-06 | A comunicação deve ser exclusivamente via HTTPS | Segurança |
| RNF-07 | O sistema deve suportar pelo menos 50 usuários simultâneos | Escalabilidade |
| RNF-08 | O sistema deve ser compatível com Chrome, Firefox, Edge e Safari (últimas 2 versões) | Compatibilidade |
| RNF-09 | O sistema deve seguir as diretrizes LGPD para tratamento de dados pessoais | Conformidade |

---

## 6. Arquitetura Proposta

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND (PWA)                      │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │  React /  │  │ Service  │  │    IndexedDB      │ │
│  │  Vue.js   │  │ Worker   │  │ (armazenamento    │ │
│  │           │  │ (cache)  │  │      offline)     │ │
│  └─────┬────┘  └────┬─────┘  └────────┬──────────┘ │
│        │             │                 │            │
│        └─────────────┼─────────────────┘            │
│                      │ Sincronização                │
└──────────────────────┼──────────────────────────────┘
                       │ HTTPS / REST API
┌──────────────────────┼──────────────────────────────┐
│                  BACKEND (API)                       │
│                      │                              │
│  ┌──────────┐  ┌─────┴────┐  ┌───────────────────┐ │
│  │  Node.js  │  │  API     │  │  Serviço de       │ │
│  │  / C#     │  │  REST    │  │  E-mail (SMTP)    │ │
│  │           │  │          │  │                   │ │
│  └─────┬────┘  └────┬─────┘  └───────────────────┘ │
│        │             │                              │
│        └──────┬──────┘                              │
│               │                                     │
│        ┌──────┴──────┐                              │
│        │  Banco de   │                              │
│        │  Dados      │                              │
│        │ (PostgreSQL │                              │
│        │  / SQLite)  │                              │
│        └─────────────┘                              │
└─────────────────────────────────────────────────────┘
```

### Tecnologias Sugeridas

| Camada | Opções | Justificativa |
|--------|--------|---------------|
| **Frontend** | React + TypeScript ou Vue.js 3 | Ecossistema maduro, bom suporte a PWA |
| **PWA/Offline** | Workbox (Service Worker) + IndexedDB (via Dexie.js) | Referência do Google para offline-first |
| **Backend** | Node.js (Express/Fastify) ou .NET 8 (ASP.NET Core) | Produtividade e performance |
| **Banco de Dados** | PostgreSQL ou SQLite (para cenários simples) | Robustez e confiabilidade |
| **E-mail** | Nodemailer (Node.js) ou SendGrid API | Facilidade de integração SMTP |
| **Autenticação** | JWT (access + refresh token) | Compatível com uso offline |

---

## 7. Telas do Sistema

### 7.1 Tela de Login
- Campos: e-mail, senha
- Botão "Entrar"
- Link "Esqueci minha senha"
- Indicador de status online/offline

### 7.2 Dashboard
- Total de pedidos do dia/semana/mês
- Pedidos pendentes de sincronização
- Últimos pedidos registrados
- Atalhos rápidos: "Novo Pedido", "Novo Cliente"
- Indicador de conexão

### 7.3 Lista de Clientes
- Tabela com: nome, e-mail, telefone, cidade
- Campo de busca com filtro em tempo real
- Botão "Novo Cliente"
- Ações por linha: Editar, Ver Pedidos, Desativar

### 7.4 Formulário de Cliente
- Campos conforme seção 4.2
- Validação em tempo real
- Botões: Salvar, Cancelar

### 7.5 Lista de Pedidos
- Tabela com: nº pedido, cliente, data, status, valor total
- Filtros: período, status, cliente
- Botão "Novo Pedido"
- Ações por linha: Editar (se rascunho), Visualizar, Cancelar, Enviar E-mail

### 7.6 Formulário de Pedido
- Seleção de cliente (busca com autocomplete)
- Lista de itens com campos: descrição, quantidade, valor unitário
- Botão "Adicionar Item" / "Remover Item"
- Cálculo automático de totais
- Campo de observações
- Botões: Salvar Rascunho, Confirmar Pedido, Cancelar

### 7.7 Tela de Envio de E-mail Consolidado
- Seleção de período (data início, data fim)
- Pré-visualização dos pedidos do período
- Resumo: quantidade de pedidos, valor total
- Botão "Enviar para Empresa"
- Status do envio

### 7.8 Configurações
- Configuração SMTP (servidor, porta, usuário, senha)
- E-mail da empresa destinatária
- Gestão de usuários (somente admin)
- Logs de sincronização e envio

---

## 8. Fluxos Principais

### 8.1 Fluxo — Cadastrar Pedido (Online)

```
Operador acessa "Novo Pedido"
    → Seleciona ou cadastra cliente
    → Adiciona itens (descrição, qtd, valor)
    → Sistema calcula total automaticamente
    → Operador escolhe "Salvar Rascunho" ou "Confirmar Pedido"
    → Se confirmado:
        → Sistema salva pedido no banco
        → Sistema envia e-mail de confirmação ao cliente
        → Pedido muda para status "Confirmado"
```

### 8.2 Fluxo — Cadastrar Pedido (Offline)

```
Operador acessa "Novo Pedido" (sem internet)
    → Seleciona ou cadastra cliente (dados locais)
    → Adiciona itens ao pedido
    → Operador confirma pedido
    → Sistema salva no IndexedDB com flag "pendente de sincronização"
    → E-mail é enfileirado localmente
    → Quando conexão é restabelecida:
        → Service Worker detecta conexão
        → Dados são enviados ao servidor (API)
        → E-mails enfileirados são disparados
        → Status de sincronização é atualizado
```

### 8.3 Fluxo — Enviar Relatório Consolidado

```
Operador/Admin acessa "Enviar Relatório"
    → Seleciona período (data início, data fim)
    → Sistema lista pedidos confirmados no período
    → Operador revisa e clica "Enviar para Empresa"
    → Sistema monta e-mail consolidado com todos os pedidos
    → E-mail é enviado para o endereço da empresa configurado
    → Sistema registra log de envio
```

---

## 9. Regras de Negócio

| ID | Regra |
|----|-------|
| RN-01 | Um pedido deve ter pelo menos 1 item para ser confirmado |
| RN-02 | Somente pedidos com status "Rascunho" podem ser editados |
| RN-03 | Pedidos cancelados não podem ser reabertos |
| RN-04 | O e-mail de confirmação só é enviado quando o pedido é confirmado |
| RN-05 | O valor total do pedido é a soma dos valores totais dos itens |
| RN-06 | Um cliente não pode ser excluído se possuir pedidos vinculados (apenas desativado) |
| RN-07 | Dados offline são sincronizados na ordem de criação (FIFO) |
| RN-08 | Em caso de conflito de sincronização, o dado mais recente prevalece |
| RN-09 | O número do pedido offline recebe prefixo "OFF-" até ser sincronizado |
| RN-10 | E-mails só podem ser enviados quando há conexão ativa |

---

## 10. API REST — Endpoints Principais

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login do usuário |
| POST | `/api/auth/refresh` | Renovar token JWT |
| POST | `/api/auth/forgot-password` | Solicitar recuperação de senha |

### Clientes
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/clientes` | Listar clientes (com busca e paginação) |
| GET | `/api/clientes/:id` | Obter detalhes de um cliente |
| POST | `/api/clientes` | Cadastrar novo cliente |
| PUT | `/api/clientes/:id` | Atualizar dados do cliente |
| DELETE | `/api/clientes/:id` | Desativar cliente (soft delete) |
| GET | `/api/clientes/:id/pedidos` | Listar pedidos de um cliente |

### Pedidos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/pedidos` | Listar pedidos (com filtros e paginação) |
| GET | `/api/pedidos/:id` | Obter detalhes de um pedido |
| POST | `/api/pedidos` | Criar novo pedido |
| PUT | `/api/pedidos/:id` | Atualizar pedido (somente rascunho) |
| PATCH | `/api/pedidos/:id/confirmar` | Confirmar pedido |
| PATCH | `/api/pedidos/:id/cancelar` | Cancelar pedido |

### E-mail
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/email/confirmar-pedido/:id` | Enviar e-mail de confirmação ao cliente |
| POST | `/api/email/relatorio` | Enviar relatório consolidado para empresa |

### Sincronização
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/sync/upload` | Enviar dados offline para o servidor |
| GET | `/api/sync/download?lastSync=TIMESTAMP` | Baixar dados atualizados desde última sincronização |

---

## 11. Modelo de Dados (Entidades)

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Usuario    │       │     Cliente       │       │     Pedido       │
├──────────────┤       ├──────────────────┤       ├──────────────────┤
│ id           │       │ id               │       │ id               │
│ nome         │       │ nome             │  1  N │ numero           │
│ email        │       │ email            │◄──────│ cliente_id (FK)  │
│ senha_hash   │       │ telefone         │       │ usuario_id (FK)  │
│ perfil       │       │ cpf_cnpj         │       │ status           │
│ ativo        │       │ endereco         │       │ observacoes      │
│ created_at   │       │ cidade           │       │ valor_total      │
│ updated_at   │       │ estado           │       │ created_at       │
└──────────────┘       │ cep              │       │ updated_at       │
                       │ observacoes      │       │ synced           │
                       │ ativo            │       └────────┬─────────┘
                       │ created_at       │                │
                       │ updated_at       │                │ 1
                       │ synced           │                │
                       └──────────────────┘                │ N
                                                  ┌────────┴─────────┐
┌──────────────────┐                              │   ItemPedido     │
│  EmailLog        │                              ├──────────────────┤
├──────────────────┤                              │ id               │
│ id               │                              │ pedido_id (FK)   │
│ tipo             │                              │ descricao        │
│ destinatario     │                              │ quantidade       │
│ assunto          │                              │ valor_unitario   │
│ status           │                              │ valor_total      │
│ erro             │                              └──────────────────┘
│ created_at       │
│ pedido_id (FK)   │
└──────────────────┘

┌──────────────────┐
│  Configuracao    │
├──────────────────┤
│ id               │
│ chave            │
│ valor            │
│ updated_at       │
└──────────────────┘
```

---

## 12. Estratégia de Sincronização Offline

1. **Armazenamento Local:** Todos os dados de clientes e pedidos são replicados no IndexedDB do navegador.
2. **Fila de Operações:** Cada operação (criar, editar) offline é registrada em uma fila local com timestamp.
3. **Detecção de Conexão:** O Service Worker monitora o evento `online` do navegador.
4. **Sincronização Incremental:** Ao reconectar, apenas operações pendentes são enviadas ao servidor.
5. **Resolução de Conflitos:** Estratégia "last-write-wins" com timestamp. Opcionalmente, alertar o usuário.
6. **Confirmação:** Após sincronização bem-sucedida, a fila local é limpa e os dados são marcados como sincronizados.

---

## 13. Segurança

| Aspecto | Implementação |
|---------|---------------|
| Autenticação | JWT com access token (15 min) + refresh token (7 dias) |
| Autorização | Middleware de verificação de perfil (admin/operador) |
| Senhas | Bcrypt com custo ≥ 12 |
| Transporte | HTTPS obrigatório (TLS 1.2+) |
| Dados locais | IndexedDB com flag `synced`; dados sensíveis evitados no cache |
| Input | Sanitização e validação em frontend e backend |
| CORS | Restrito aos domínios autorizados |
| Rate Limiting | Limitar tentativas de login (5 por minuto) |
| LGPD | Consentimento para coleta de dados; opção de exclusão de dados pessoais |

---

## 14. Estimativa de Módulos

| Módulo | Complexidade |
|--------|:------------:|
| Autenticação & Usuários | Média |
| Cadastro de Clientes | Baixa |
| Cadastro de Pedidos | Média |
| Envio de E-mails | Média |
| PWA / Offline / Sincronização | Alta |
| Dashboard / Relatórios | Média |
| Configurações | Baixa |

---

## 15. Critérios de Aceite (Resumo)

- [ ] Operador consegue cadastrar cliente online e offline
- [ ] Operador consegue criar e confirmar pedido online e offline
- [ ] Pedido confirmado dispara e-mail para o cliente automaticamente
- [ ] Administrador consegue enviar relatório consolidado por período para a empresa
- [ ] Dados offline são sincronizados automaticamente ao reconectar
- [ ] E-mails pendentes são enviados após sincronização
- [ ] Sistema exibe indicador claro de status online/offline
- [ ] Sistema é instalável como PWA em dispositivos móveis
- [ ] Todas as comunicações usam HTTPS
- [ ] Senhas são armazenadas com hash seguro

---

*Documento gerado como base para desenvolvimento. Deve ser revisado e aprovado antes do início da implementação.*
