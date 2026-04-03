# 📦 Sistema de Pedidos Multi-Fábrica

## 🧭 Visão Geral

Sistema de pedidos com suporte a múltiplas fábricas, onde cada fábrica possui seus próprios usuários, produtos e pedidos.

---

# 🏗️ Arquitetura Conceitual

- Multi-tenant por fábrica
- Controle de acesso por usuário/fábrica
- Persistência de pedidos
- Envio de pedidos por email (assíncrono)

---

# 🧱 Entidades Principais

## 🏭 Factory
- Id
- Name
- OrderEmail (email destinatário dos pedidos)

---

## 👤 User
- Id
- Name
- Email

---

## 🔗 FactoryUser (Relacionamento)
- UserId
- FactoryId
- Role (Admin | Seller)

---

## 👥 Customer
- Id
- Name
- Email
- Phone

---

## 📦 Product
- Id
- FactoryId
- Name
- Price
- SKU
- IsActive

---

## 🧾 Order
- Id
- FactoryId
- UserId (quem criou)
- CustomerName
- Status
- Subtotal
- Discount
- Total
- CreatedAt

---

## 📄 OrderItem
- Id
- OrderId
- ProductId
- ProductName (snapshot)
- UnitPrice (snapshot)
- Quantity
- Discount
- Total

---

# 🔄 Status do Pedido

```txt
Draft
Enviado
EmProcessamento
Finalizado
Cancelado
💰 Regras de Desconto
Tipos:
Desconto por item (%)
Desconto no total (%)
Regras sugeridas:
Aplicar desconto por item primeiro
Depois aplicar desconto no total
Definir limite máximo (ex: 30%)
Apenas Admin pode aplicar desconto acima de X%
⚠️ Regras Críticas
📌 Snapshot de Preço

O preço do produto deve ser salvo no momento do pedido.

Motivo:

Evitar inconsistência ao alterar preços futuramente
📌 Totais Persistidos

Salvar no pedido:

Subtotal
Total de desconto
Total final
📌 Isolamento por Fábrica

Todas as queries devem conter:

WHERE FactoryId = @FactoryId
📧 Envio de Pedido
Fluxo recomendado:
Pedido criado
    ↓
Evento disparado
    ↓
Worker envia email
Benefícios:
Retry automático
Desacoplamento
Escalabilidade
🔐 Controle de Acesso
Roles:
Admin
Gerencia usuários
Define configurações
Pode aplicar descontos avançados
Seller
Cria pedidos
Aplica descontos limitados
🧾 Auditoria

Todas as entidades principais devem conter:

CreatedAt
CreatedBy
UpdatedAt
UpdatedBy
🔎 Funcionalidades Esperadas
MVP
Cadastro de fábrica
Cadastro de usuário
Cadastro de produto
Criação de pedido
Aplicação de desconto
Envio por email
Intermediário
Histórico de pedidos
Filtro por data
Busca por cliente
Reenvio de pedido