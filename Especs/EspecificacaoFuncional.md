# Especificação Funcional — Sistema de Gestão de Fazendas (FarmsJose)

**Versão:** 1.0  
**Data:** 31/03/2026  
**Status:** Em elaboração  

---

## 1. Visão Geral

### 1.1 Objetivo

Sistema web para gestão de fazendas de gado, permitindo o cadastro de propriedades rurais, registro e controle de animais (por lote, categoria e histórico sanitário), e consulta consolidada com indicadores financeiros por fazenda.

O sistema substituirá a solução legada em Excel/VBA, oferecendo uma interface moderna, responsiva, com melhor usabilidade, segurança e escalabilidade.

### 1.2 Stack Tecnológica

| Camada       | Tecnologia                                  |
|--------------|---------------------------------------------|
| **Backend**  | Python 3.12+ / FastAPI                      |
| **ORM**      | SQLAlchemy 2.x                              |
| **Banco**    | PostgreSQL 16                               |
| **Migrations** | Alembic                                   |
| **Frontend** | React 18 + TypeScript + Vite                |
| **UI Kit**   | Tailwind CSS 3 + shadcn/ui                  |
| **Tabelas**  | TanStack Table (filtros, paginação, sort)   |
| **Formulários** | React Hook Form + Zod                   |
| **State**    | TanStack Query (server state)               |
| **Auth**     | JWT (access + refresh tokens)               |
| **Infra**    | Docker Compose (dev), Nginx (prod)          |

### 1.3 Princípios de Design

- **Design responsivo** — funciona em desktop, tablet e mobile
- **Dark/Light mode** — tema claro e escuro
- **Acessibilidade** — WCAG 2.1 AA
- **UX moderna** — cards, dashboards, drawers laterais, toasts de feedback, skeleton loaders
- **Busca e filtros dinâmicos** — autocomplete e filtros em tempo real nas tabelas

---

## 2. Arquitetura Geral

```
┌────────────────────────────────────────────────────────┐
│                    FRONTEND (SPA)                       │
│   React + TypeScript + Tailwind + shadcn/ui            │
│                                                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Cadastro │  │  Cadastro    │  │  Resumo por      │  │
│  │ Fazendas │  │  Animais     │  │  Fazenda         │  │
│  └──────────┘  └──────────────┘  └──────────────────┘  │
└───────────────────────┬────────────────────────────────┘
                        │ HTTP/REST (JSON)
                        ▼
┌────────────────────────────────────────────────────────┐
│                   BACKEND (API)                         │
│   FastAPI + SQLAlchemy + Alembic                       │
│                                                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ /fazendas│  │  /animais    │  │  /resumo         │  │
│  └──────────┘  └──────────────┘  └──────────────────┘  │
└───────────────────────┬────────────────────────────────┘
                        │ SQL
                        ▼
               ┌─────────────────┐
               │   PostgreSQL    │
               └─────────────────┘
```

---

## 3. Modelo de Dados

### 3.1 Diagrama ER (Resumido)

```
┌──────────────────┐         ┌──────────────────────────┐
│     fazenda      │         │         animal            │
├──────────────────┤    1:N  ├──────────────────────────┤
│ id (PK)          │◄───────┐│ id (PK)                  │
│ id_sistema       │        ││ fazenda_id (FK)           │
│ razao_social     │        ││ lote_numero              │
│ nome_fantasia    │        ││ tipo_identificacao        │
│ cnpj             │        ││ sexo                     │
│ inscricao_est    │        ││ categoria                │
│ rg               │        ││ idade_meses              │
│ cpf              │        ││ peso_inicial_kg          │
│ telefone         │        ││ preco_compra             │
│ celular          │        ││ origem                   │
│ endereco         │        ││ historico_sanitario       │
│ numero_km        │        ││ data_primeira_pesagem     │
│ bairro           │        ││ data_cadastro            │
│ ponto_referencia │        ││ created_at               │
│ cep              │        ││ updated_at               │
│ email            │        │└──────────────────────────┘
│ caixa_postal     │        │
│ cidade           │        │  ┌─────────────────────────┐
│ estado           │        │  │   historico_sanitario    │
│ data_cadastro    │        │  ├─────────────────────────┤
│ created_at       │        │  │ id (PK)                 │
│ updated_at       │        │  │ animal_id (FK)          │
└──────────────────┘        │  │ vacina                  │
                            │  │ data_aplicacao          │
                            │  │ observacao              │
                            │  │ created_at              │
                            │  └─────────────────────────┘
                            │
                            │  ┌─────────────────────────┐
                            │  │    custo_fazenda         │
                            │  ├─────────────────────────┤
                            └──│ id (PK)                 │
                               │ fazenda_id (FK)          │
                               │ custo_total_lote         │
                               │ custo_mensal             │
                               │ custo_diario             │
                               │ custo_total_animal       │
                               │ preco_venda              │
                               │ created_at               │
                               │ updated_at               │
                               └─────────────────────────┘
```

### 3.2 Tabela `fazenda`

| Coluna              | Tipo             | Restrições              | Descrição                          |
|---------------------|------------------|-------------------------|------------------------------------|
| `id`                | UUID             | PK, auto               | Identificador interno              |
| `id_sistema`        | INTEGER          | UNIQUE, auto-increment  | ID sequencial visível ao usuário   |
| `razao_social`      | VARCHAR(200)     | NOT NULL                | Razão social da fazenda            |
| `nome_fantasia`     | VARCHAR(200)     | NOT NULL                | Nome fantasia                      |
| `cnpj`              | VARCHAR(18)      | UNIQUE, nullable        | CNPJ (formatado XX.XXX.XXX/XXXX-XX) |
| `inscricao_estadual`| VARCHAR(20)      | nullable                | Inscrição estadual                 |
| `rg`                | VARCHAR(20)      | nullable                | RG do proprietário                 |
| `cpf`               | VARCHAR(14)      | nullable                | CPF do proprietário (XXX.XXX.XXX-XX) |
| `telefone`          | VARCHAR(15)      | nullable                | Telefone fixo                      |
| `celular`           | VARCHAR(15)      | nullable                | Celular                            |
| `endereco`          | VARCHAR(300)     | nullable                | Endereço (logradouro)              |
| `numero_km`         | VARCHAR(20)      | nullable                | Número ou KM                       |
| `bairro`            | VARCHAR(100)     | nullable                | Bairro                             |
| `ponto_referencia`  | VARCHAR(200)     | nullable                | Ponto de referência                |
| `cep`               | VARCHAR(10)      | nullable                | CEP (XXXXX-XXX)                    |
| `email`             | VARCHAR(200)     | nullable                | E-mail de contato                  |
| `caixa_postal`      | VARCHAR(20)      | nullable                | Caixa postal                       |
| `cidade`            | VARCHAR(100)     | nullable                | Cidade                             |
| `estado`            | CHAR(2)          | nullable                | UF (sigla do estado)               |
| `data_cadastro`     | DATE             | NOT NULL, default=hoje  | Data de cadastro                   |
| `created_at`        | TIMESTAMP        | auto                    | Criação do registro                |
| `updated_at`        | TIMESTAMP        | auto on update          | Última atualização                 |

### 3.3 Tabela `animal`

| Coluna                  | Tipo           | Restrições              | Descrição                              |
|-------------------------|----------------|-------------------------|----------------------------------------|
| `id`                    | UUID           | PK, auto                | Identificador interno                  |
| `fazenda_id`            | UUID           | FK → fazenda.id, NOT NULL | Fazenda à qual pertence              |
| `lote_numero`           | INTEGER        | NOT NULL                | Número do lote                         |
| `tipo_identificacao`    | VARCHAR(50)    | nullable                | Tipo de identificação (brinco, chip…)  |
| `codigo_identificacao`  | VARCHAR(50)    | nullable                | Código/número da identificação         |
| `sexo`                  | ENUM('M','F')  | NOT NULL                | Sexo do animal                         |
| `is_vaca`               | BOOLEAN        | default false           | Categoria: Vaca                        |
| `is_touro`              | BOOLEAN        | default false           | Categoria: Touro                       |
| `is_cria`               | BOOLEAN        | default false           | Categoria: Cria                        |
| `is_recria`             | BOOLEAN        | default false           | Categoria: Recria                      |
| `is_engorda`            | BOOLEAN        | default false           | Categoria: Engorda                     |
| `idade_meses`           | INTEGER        | nullable                | Idade em meses                         |
| `peso_inicial_kg`       | DECIMAL(8,2)   | nullable                | Peso inicial em kg                     |
| `preco_compra`          | DECIMAL(12,2)  | nullable, default 0     | Preço de compra (R$)                   |
| `origem`                | VARCHAR(100)   | nullable                | Origem / procedência do animal         |
| `historico_sanitario`   | VARCHAR(500)   | nullable                | Histórico sanitário (texto resumo)     |
| `data_primeira_pesagem` | DATE           | nullable                | Data da primeira pesagem               |
| `data_cadastro`         | DATE           | NOT NULL, default=hoje  | Data de cadastro                       |
| `created_at`            | TIMESTAMP      | auto                    | Criação do registro                    |
| `updated_at`            | TIMESTAMP      | auto on update          | Última atualização                     |

### 3.4 Tabela `historico_sanitario`

| Coluna           | Tipo           | Restrições              | Descrição                          |
|------------------|----------------|-------------------------|------------------------------------|
| `id`             | UUID           | PK, auto                | Identificador interno              |
| `animal_id`      | UUID           | FK → animal.id, NOT NULL | Animal relacionado                |
| `vacina`         | VARCHAR(100)   | NOT NULL                | Nome da vacina/procedimento        |
| `data_aplicacao` | DATE           | NOT NULL                | Data de aplicação                  |
| `observacao`     | TEXT           | nullable                | Observações adicionais             |
| `created_at`     | TIMESTAMP      | auto                    | Criação do registro                |

**Vacinas comuns identificadas no sistema legado:** PE-DEC, RAIVA, CARB (Carbúnculo)

### 3.5 Tabela `custo_fazenda`

| Coluna               | Tipo           | Restrições              | Descrição                          |
|-----------------------|----------------|-------------------------|------------------------------------|
| `id`                  | UUID           | PK, auto                | Identificador interno              |
| `fazenda_id`          | UUID           | FK → fazenda.id, UNIQUE  | Fazenda relacionada               |
| `custo_total_lote`    | DECIMAL(12,2)  | default 0               | Custo total do lote (R$)           |
| `custo_mensal`        | DECIMAL(12,2)  | default 0               | Custo mensal (R$)                  |
| `custo_diario`        | DECIMAL(12,2)  | default 0               | Custo diário (R$)                  |
| `custo_total_animal`  | DECIMAL(12,2)  | default 0               | Custo total por animal (R$)        |
| `preco_venda`         | DECIMAL(12,2)  | default 0               | Preço de venda (R$)               |
| `created_at`          | TIMESTAMP      | auto                    | Criação do registro                |
| `updated_at`          | TIMESTAMP      | auto on update          | Última atualização                 |

**Campos calculados (não persistidos):**

| Campo             | Fórmula                                    |
|-------------------|--------------------------------------------|
| `total_animais`   | COUNT de animais vinculados à fazenda       |
| `preco_animal`    | `custo_total_lote / total_animais`          |
| `lucro`           | `preco_venda - custo_total_animal`          |

---

## 4. Módulo 1 — Cadastro de Fazendas

### 4.1 Descrição

Permite o cadastro, edição, exclusão e busca de fazendas (propriedades rurais). Cada fazenda é identificada por um ID sequencial do sistema e possui dados cadastrais completos.

### 4.2 Campos do Formulário

| Campo             | Tipo Input         | Obrigatório | Validação                                      |
|-------------------|--------------------|-------------|------------------------------------------------|
| ID Sistema        | Readonly (auto)    | —           | Gerado automaticamente                         |
| Dt. Cadastro      | DatePicker         | Sim         | Default = data atual; não pode ser futura       |
| Razão Social      | Text               | Sim         | Mín. 3, Máx. 200 caracteres                    |
| Nome Fantasia     | Text               | Sim         | Mín. 2, Máx. 200 caracteres                    |
| CNPJ              | Text (máscara)     | Não         | Validar dígitos verificadores (algoritmo CNPJ)  |
| Inscrição Estadual| Text               | Não         | Máx. 20 caracteres                              |
| RG                | Text               | Não         | Máx. 20 caracteres                              |
| CPF               | Text (máscara)     | Não         | Validar dígitos verificadores (algoritmo CPF)   |
| Telefone          | Text (máscara)     | Não         | Formato: (XX) XXXX-XXXX                         |
| Celular           | Text (máscara)     | Não         | Formato: (XX) XXXXX-XXXX                        |
| Endereço          | Text               | Não         | Máx. 300 caracteres                              |
| Nº / Km           | Text               | Não         | Máx. 20 caracteres                               |
| Bairro            | Text               | Não         | Máx. 100 caracteres                              |
| Pt. Referência    | Text               | Não         | Máx. 200 caracteres                              |
| CEP               | Text (máscara)     | Não         | Formato: XXXXX-XXX; integrar com API ViaCEP      |
| E-mail            | Email              | Não         | Validar formato de e-mail                        |
| Cx. Postal        | Text               | Não         | Máx. 20 caracteres                               |
| Cidade            | Text (autocomplete)| Não         | Máx. 100 caracteres                              |
| Estado            | Select (UF)        | Não         | Dropdown com 27 UFs brasileiras                  |

### 4.3 Regras de Negócio

| # | Regra |
|---|-------|
| RN-F01 | CNPJ deve ser único no sistema. Se informado, validar dígitos verificadores. |
| RN-F02 | CPF deve ser único no sistema. Se informado, validar dígitos verificadores. |
| RN-F03 | Ao preencher o CEP e pressionar Tab/blur, buscar automaticamente Endereço, Bairro, Cidade e Estado via API ViaCEP. |
| RN-F04 | Não é possível excluir fazenda que possua animais vinculados. Exibir mensagem: "Esta fazenda possui X animais cadastrados. Remova os animais antes de excluir." |
| RN-F05 | O campo ID Sistema é somente leitura e auto-incrementado. |
| RN-F06 | Dt. Cadastro não pode ser data futura. |

### 4.4 Funcionalidades

- **Novo**: Abre formulário limpo para cadastro
- **Salvar**: Persiste o registro (criação ou atualização)
- **Excluir**: Remove a fazenda (com confirmação via modal e validação RN-F04)
- **Busca**: Campo de pesquisa por Razão Social ou Nome Fantasia (busca parcial, case-insensitive)
- **Listagem**: Tabela inferior exibindo todas as fazendas cadastradas com colunas: ID Sist, Razão Social, Nome Fantasia, CNPJ, Cidade/UF, Dt. Cadastro
- **Seleção na tabela**: Ao clicar em uma fazenda na listagem, preenche o formulário acima para edição

### 4.5 Layout Frontend (Sofisticado)

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Breadcrumb > Cadastros > Fazendas               [👤 User] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── Card: "Nova Fazenda" ──────────────────────────────────────┐  │
│  │                                                                │  │
│  │  ┌─ Seção: Dados Principais ───────────────────────────────┐  │  │
│  │  │  [ID Sistema: 18]  [Dt. Cadastro: 📅 27/03/2026]       │  │  │
│  │  │  [Razão Social _______________] [Nome Fantasia ________]│  │  │
│  │  │  [CNPJ __ ___ ___/____-__]  [Insc. Est. ____________]  │  │  │
│  │  │  [RG ___________]  [CPF ___.___.___-__]                 │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌─ Seção: Contato ────────────────────────────────────────┐  │  │
│  │  │  [Telefone (__)____-____]  [Celular (__)_____-____]     │  │  │
│  │  │  [E-mail ______________________________]                │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌─ Seção: Endereço ───────────────────────────────────────┐  │  │
│  │  │  [CEP _____-___] 🔍 auto                                │  │  │
│  │  │  [Endereço ________________________] [Nº/Km ________]   │  │  │
│  │  │  [Bairro _______________] [Pt. Referência _____________]│  │  │
│  │  │  [Cx. Postal ______] [Cidade __________] [UF ▼ SP]     │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  [ 🟢 Salvar ]  [ 🔴 Excluir ]  [ Limpar ]                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── Card: "Fazendas Cadastradas" ──────────────────────────────┐  │
│  │  🔍 [Buscar por nome...___________________]  [Filtros ▼]     │  │
│  │                                                                │  │
│  │  ┌────┬──────────────┬──────────────┬───────────┬─────┬─────┐ │  │
│  │  │ ID │ Razão Social │ Nome Fantasia│   CNPJ    │Cid/UF│ Dt │ │  │
│  │  ├────┼──────────────┼──────────────┼───────────┼─────┼─────┤ │  │
│  │  │ 18 │FAZENDA ESTIVA│FAZENDA ESTIVA│           │PIRAC│27/03│ │  │
│  │  │ 19 │FAZENDA EST. 2│ESTIVA 2      │           │PIRAC│31/03│ │  │
│  │  └────┴──────────────┴──────────────┴───────────┴─────┴─────┘ │  │
│  │  Mostrando 1-2 de 2 │ ◄ 1 ►  │  [10 ▼ por página]           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  📊 Total de fazendas cadastradas: 2                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Diferenciais em relação ao sistema legado:**
- Formulário dividido em seções com acordeão (Dados Principais, Contato, Endereço)
- Máscaras de input com formatação automática (CNPJ, CPF, telefone, CEP)
- Auto-preenchimento via CEP (API ViaCEP)
- Tabela com paginação, ordenação por coluna e busca em tempo real
- Feedback visual: toast de sucesso/erro, loading states, skeleton loaders
- Modal de confirmação para exclusão
- Responsivo: em mobile, formulário exibido em coluna única

---

## 5. Módulo 2 — Cadastro de Animais

### 5.1 Descrição

Permite o registro detalhado de animais por fazenda, incluindo informações de lote, categorização, peso, preço de compra, origem e histórico sanitário. Exibe totalizadores automáticos por sexo e categoria.

### 5.2 Campos do Formulário (por animal — linha da grid)

| Campo                  | Tipo Input           | Obrigatório | Validação                              |
|------------------------|----------------------|-------------|----------------------------------------|
| Fazenda                | Select/Autocomplete  | Sim         | Deve existir no cadastro de fazendas   |
| ID Sistema (Fazenda)   | Readonly             | —           | Preenchido ao selecionar fazenda       |
| Custo Total Lote       | Currency (readonly)  | —           | Calculado: soma dos preços de compra   |
| Dt. Cadastro           | DatePicker           | Sim         | Default = data atual                   |
| Lote Nº                | Number               | Sim         | Inteiro positivo                       |
| Tipo Identificação     | Text                 | Não         | Máx. 50 caracteres                     |
| Código Identificação   | Text                 | Não         | Máx. 50 caracteres                     |
| Sexo                   | Radio (M/F)          | Sim         | Apenas M ou F                          |
| Vaca                   | Checkbox             | Não         | —                                      |
| Touro                  | Checkbox             | Não         | —                                      |
| Cria                   | Checkbox             | Não         | —                                      |
| Recria                 | Checkbox             | Não         | —                                      |
| Engorda                | Checkbox             | Não         | —                                      |
| Idade                  | Number + Unidade     | Não         | Inteiro positivo; unidade: meses/anos  |
| Peso Inicial (kg)      | Number               | Não         | Decimal positivo                       |
| Preço Compra (R$)      | Currency             | Não         | Decimal positivo                       |
| Origem                 | Text/Select          | Não         | Autocompletar com origens anteriores   |
| Histórico Sanitário    | Text/Tags            | Não         | Ex: PE-DEC, RAIVA, CARB               |
| Data Primeira Pesagem  | DatePicker           | Não         | Não pode ser futura                    |

### 5.3 Regras de Negócio

| # | Regra |
|---|-------|
| RN-A01 | Todo animal deve estar vinculado a uma fazenda válida. |
| RN-A02 | Se sexo = M, o checkbox "Vaca" deve ser desabilitado. Se sexo = F, o checkbox "Touro" deve ser desabilitado. |
| RN-A03 | O Custo Total Lote é calculado automaticamente: soma de `preco_compra` de todos os animais da fazenda selecionada. |
| RN-A04 | Totalizadores (rodapé) devem ser atualizados dinamicamente ao adicionar/remover/editar animais. |
| RN-A05 | O campo "Origem" deve oferecer autocomplete com origens já cadastradas anteriormente (ex: JAPAO). |
| RN-A06 | O histórico sanitário pode ser informado como tags (chips) selecionáveis, com as vacinas comuns como sugestão. |
| RN-A07 | Não permitir duplicata de animal com mesmo (fazenda_id + lote_numero + codigo_identificacao). |
| RN-A08 | Data Primeira Pesagem não pode ser futura. |

### 5.4 Totalizadores (Rodapé)

Exibidos em cards ao final da listagem de animais:

| Totalizador      | Cálculo                                          |
|------------------|------------------------------------------------- |
| Total de Animais | COUNT total de animais no lote/fazenda            |
| Total Machos     | COUNT onde sexo = M                               |
| Total Fêmeas     | COUNT onde sexo = F                               |
| Total Vaca       | COUNT onde is_vaca = true                          |
| Total Touro      | COUNT onde is_touro = true                         |
| Total Cria       | COUNT onde is_cria = true                          |
| Total Recria     | COUNT onde is_recria = true                        |
| Total Engorda    | COUNT onde is_engorda = true                       |

### 5.5 Funcionalidades

- **Seleção de Fazenda**: Buscar e selecionar a fazenda (autocomplete). Ao selecionar, carrega os animais já cadastrados.
- **Adicionar Animal**: Linha nova na grid ou formulário em drawer lateral
- **Editar Animal**: Clicar na linha para editar em drawer lateral ou inline
- **Remover Animal**: Botão de exclusão por linha (com confirmação)
- **Busca de Fazendas**: Lista de fazendas cadastradas na lateral inferior (como no legado)
- **Exportar**: Exportar lista de animais em CSV/Excel

### 5.6 Layout Frontend (Sofisticado)

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Breadcrumb > Cadastros > Animais                 [👤 User]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── Card: "Fazenda Selecionada" ───────────────────────────────┐  │
│  │  [🔍 Buscar fazenda...____________________]                   │  │
│  │                                                                │  │
│  │  ID: 18  │  Fazenda: FAZENDA ESTIVA  │  Dt. Cadastro: 27/03   │  │
│  │  Custo Total Lote: R$ 4.460,00                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── Card: "Animais do Lote" ──── [+ Adicionar Animal] [📥 CSV]─┐  │
│  │                                                                │  │
│  │  ┌───┬─────┬─────┬──┬─────────────┬─────┬──────┬────────┬───┐ │  │
│  │  │Lote│TipoID│CodID│MF│ Categorias │Idade│Peso  │Pr.Comp │Ori│ │  │
│  │  ├───┼─────┼─────┼──┼─────────────┼─────┼──────┼────────┼───┤ │  │
│  │  │ 15│  1  │ 130 │ F│ ☑Recria     │12 m │245 kg│2.230,00│JAP│ │  │
│  │  │   │     │     │  │             │     │      │        │   │ │  │
│  │  │   │ Sanitário: PE-DEC | RAIVA | CARB    Pesagem: 10/10/25 │ │  │
│  │  ├───┼─────┼─────┼──┼─────────────┼─────┼──────┼────────┼───┤ │  │
│  │  │ 17│  1  │ D15 │ F│ ☑Recria     │12   │245 kg│2.230,00│JAP│ │  │
│  │  │   │     │     │  │             │     │      │        │   │ │  │
│  │  │   │ Sanitário: PE-DEC | RAIVA | CARB    Pesagem: 10/10/25 │ │  │
│  │  └───┴─────┴─────┴──┴─────────────┴─────┴──────┴────────┴───┘ │  │
│  │                                                                │  │
│  │  Mostrando 1-2 de 2 │ ◄ 1 ►  │  [10 ▼ por página]           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── Totalizadores (Cards em grid) ─────────────────────────────┐  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ 🐄 Total │ │ ♂ Machos │ │ ♀ Fêmeas │ │ 🐂 Touro │         │  │
│  │  │    2     │ │    0     │ │    2     │ │    0     │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ 🐮 Vaca  │ │ 🐣 Cria  │ │ 🔄 Recria│ │ 🏋 Engorda│         │  │
│  │  │    0     │ │    0     │ │    2     │ │    0     │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── Card: "Busca Rápida de Fazendas" ──────────────────────────┐  │
│  │  ┌────┬──────────────┬──────────┐                              │  │
│  │  │ ID │ Fazenda      │ Dt. Cad. │                              │  │
│  │  ├────┼──────────────┼──────────┤                              │  │
│  │  │ 18 │FAZENDA ESTIVA│ 27/03/26 │  ← selecionada              │  │
│  │  │ 19 │FAZENDA EST. 2│ 31/03/26 │                              │  │
│  │  └────┴──────────────┴──────────┘                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Diferenciais em relação ao sistema legado:**
- Grid interativa com TanStack Table: ordenação, filtro por coluna, redimensionamento
- Drawer lateral para edição detalhada de cada animal (em vez de edição inline confusa)
- Histórico sanitário como chips/tags coloridos com autocomplete
- Cards de totalizadores coloridos com ícones
- Linha expandível para ver detalhes (sanitário, pesagem)
- Botão de exportação CSV/Excel
- Linha "(Novo)" substituída por botão "+ Adicionar Animal" que abre drawer

---

## 6. Módulo 3 — Resumo por Fazenda (Consulta)

### 6.1 Descrição

Tela de consulta consolidada que exibe indicadores financeiros e de rebanho para uma fazenda selecionada. Permite visualizar custos, preços e lucro estimado.

### 6.2 Campos Exibidos

| Campo               | Tipo       | Origem                                    |
|---------------------|------------|-------------------------------------------|
| ID Sistema          | Readonly   | fazenda.id_sistema                         |
| Fazenda             | Readonly   | fazenda.nome_fantasia                      |
| Custo Total Lote    | Currency   | custo_fazenda.custo_total_lote OU soma preco_compra |
| Total de Animais    | Number     | COUNT(animal) WHERE fazenda_id = X         |
| Preço Animal        | Currency   | Calculado: custo_total_lote / total_animais |
| Custo Mensal        | Currency   | custo_fazenda.custo_mensal (editável)       |
| Custo Diário        | Currency   | Calculado: custo_mensal / 30               |
| Custo Total Animal  | Currency   | custo_fazenda.custo_total_animal (editável) |
| Preço Venda         | Currency   | custo_fazenda.preco_venda (editável)        |
| Lucro               | Currency   | Calculado: preco_venda - custo_total_animal |

### 6.3 Regras de Negócio

| # | Regra |
|---|-------|
| RN-R01 | Ao selecionar uma fazenda, o Total de Animais é calculado automaticamente a partir do cadastro de animais. |
| RN-R02 | Preço Animal = Custo Total Lote / Total de Animais. Se total = 0, exibir R$ 0,00. |
| RN-R03 | Custo Diário = Custo Mensal / 30. |
| RN-R04 | Lucro = Preço Venda - Custo Total Animal. Se negativo, exibir em vermelho. |
| RN-R05 | Os campos Custo Mensal, Custo Total Animal e Preço Venda são editáveis e persistidos na tabela custo_fazenda. |
| RN-R06 | A busca de fazendas funciona por nome (busca parcial) e exibe lista para seleção. |

### 6.4 Funcionalidades

- **Busca de Fazenda**: Autocomplete com lista de fazendas cadastradas
- **Salvar**: Persiste custos editáveis (mensal, total animal, preço venda)
- **Dashboard visual**: Indicadores em cards coloridos com ícones
- **Indicação visual de lucro/prejuízo**: Verde para lucro, vermelho para prejuízo

### 6.5 Layout Frontend (Sofisticado)

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Breadcrumb > Consultas > Resumo por Fazenda      [👤 User]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── Card: "Selecionar Fazenda" ────────────────────────────────┐  │
│  │  [🔍 Buscar fazenda...____________________]                   │  │
│  │                                                                │  │
│  │  ID: 18  │  FAZENDA ESTIVA                                    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── Dashboard: Indicadores ─────────────────────────────────────┐  │
│  │                                                                 │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │  │
│  │  │ 💰 Custo Total  │  │ 🐄 Total        │  │ 💲 Preço /      │ │  │
│  │  │    Lote          │  │    Animais      │  │    Animal       │ │  │
│  │  │  R$ 4.460,00    │  │       2         │  │  R$ 2.230,00   │ │  │
│  │  │  ░░░░░░░░░ blue │  │  ░░░░░░░░ green │  │  ░░░░░░░ blue  │ │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘ │  │
│  │                                                                 │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │  │
│  │  │ 📅 Custo        │  │ 📆 Custo        │  │ 🐮 Custo Total │ │  │
│  │  │    Mensal       │  │    Diário       │  │    Animal       │ │  │
│  │  │  [R$ 0,00  ]   │  │   R$ 0,00       │  │  [R$ 0,00  ]   │ │  │
│  │  │  ░░░░░░ orange  │  │  ░░░░░░ orange  │  │  ░░░░░░ orange │ │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘ │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────┐  ┌────────────────────────────┐   │  │
│  │  │ 🏷️ Preço Venda          │  │ 📈 Lucro                   │   │  │
│  │  │  [R$ 0,00           ]   │  │   R$ 0,00                  │   │  │
│  │  │  ░░░░░░░░░░░░░ purple   │  │  ░░░░░░░░░░░ green/red     │   │  │
│  │  └─────────────────────────┘  └────────────────────────────┘   │  │
│  │                                                                 │  │
│  │  [ 🟢 Salvar Custos ]                                          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── Card: "Fazendas Cadastradas" ──────────────────────────────┐  │
│  │  [🔍 Filtrar...______]                                        │  │
│  │  ┌────────────────────────────────────┐                        │  │
│  │  │ FAZENDA ESTIVA          ID: 18    │ ← selecionada (borda) │  │
│  │  │ Piracicaba/SP  │  2 animais       │                        │  │
│  │  ├────────────────────────────────────┤                        │  │
│  │  │ FAZENDA ESTIVA 2        ID: 19    │                        │  │
│  │  │ Piracicaba/SP  │  0 animais       │                        │  │
│  │  └────────────────────────────────────┘                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Diferenciais em relação ao sistema legado:**
- Dashboard estilo admin panel com cards de KPI coloridos
- Campos editáveis estilizados (inline editing nos cards)
- Lucro com indicação visual: verde (positivo), vermelho (negativo), com ícone de seta
- Lista de fazendas em formato card (não tabela simples) com informações resumidas
- Animação suave ao trocar de fazenda
- Responsivo: cards em coluna única no mobile

---

## 7. API REST — Endpoints

### 7.1 Autenticação

| Método | Endpoint           | Descrição              |
|--------|-------------------|------------------------|
| POST   | `/api/auth/login`  | Login (retorna JWT)    |
| POST   | `/api/auth/refresh`| Refresh do token       |
| POST   | `/api/auth/logout` | Logout (invalida token)|

### 7.2 Fazendas

| Método | Endpoint                    | Descrição                                  |
|--------|----------------------------|--------------------------------------------|
| GET    | `/api/fazendas`            | Listar fazendas (paginado, filtros)         |
| GET    | `/api/fazendas/{id}`       | Buscar fazenda por ID                       |
| POST   | `/api/fazendas`            | Criar nova fazenda                          |
| PUT    | `/api/fazendas/{id}`       | Atualizar fazenda                           |
| DELETE | `/api/fazendas/{id}`       | Excluir fazenda                             |
| GET    | `/api/fazendas/busca`      | Busca por nome (query param: `q`)           |
| GET    | `/api/fazendas/{id}/resumo`| Resumo financeiro da fazenda                |

**Query params para GET `/api/fazendas`:**

| Param    | Tipo    | Descrição                        |
|----------|---------|----------------------------------|
| `q`      | string  | Busca por razão social ou fantasia|
| `page`   | int     | Página (default: 1)              |
| `limit`  | int     | Itens por página (default: 10)   |
| `sort`   | string  | Campo de ordenação               |
| `order`  | string  | `asc` ou `desc`                  |

**Exemplo de response — GET `/api/fazendas/{id}`:**

```json
{
  "id": "uuid-here",
  "id_sistema": 18,
  "razao_social": "FAZENDA ESTIVA",
  "nome_fantasia": "FAZENDA ESTIVA",
  "cnpj": null,
  "inscricao_estadual": null,
  "rg": null,
  "cpf": null,
  "telefone": null,
  "celular": null,
  "endereco": "PIRAJANHEMBI",
  "numero_km": "KM 188,5",
  "bairro": "IBITIRUNA",
  "ponto_referencia": null,
  "cep": null,
  "email": null,
  "caixa_postal": null,
  "cidade": "PIRACICABA",
  "estado": "SP",
  "data_cadastro": "2025-10-10",
  "created_at": "2025-10-10T00:00:00Z",
  "updated_at": "2026-03-27T00:00:00Z"
}
```

### 7.3 Animais

| Método | Endpoint                          | Descrição                                    |
|--------|----------------------------------|----------------------------------------------|
| GET    | `/api/animais`                   | Listar animais (paginado, filtros)            |
| GET    | `/api/animais/{id}`              | Buscar animal por ID                          |
| POST   | `/api/animais`                   | Criar novo animal                             |
| PUT    | `/api/animais/{id}`              | Atualizar animal                              |
| DELETE | `/api/animais/{id}`              | Excluir animal                                |
| GET    | `/api/fazendas/{id}/animais`     | Listar animais de uma fazenda                 |
| GET    | `/api/fazendas/{id}/totalizadores`| Totalizadores de animais da fazenda          |
| GET    | `/api/animais/origens`           | Listar origens distintas (para autocomplete)  |

**Query params para GET `/api/animais` e `/api/fazendas/{id}/animais`:**

| Param       | Tipo    | Descrição                         |
|-------------|---------|-----------------------------------|
| `lote`      | int     | Filtrar por número do lote         |
| `sexo`      | string  | Filtrar por sexo (M/F)             |
| `categoria` | string  | Filtrar por categoria              |
| `page`      | int     | Página (default: 1)               |
| `limit`     | int     | Itens por página (default: 10)    |

**Exemplo de response — GET `/api/fazendas/{id}/totalizadores`:**

```json
{
  "total_animais": 2,
  "total_machos": 0,
  "total_femeas": 2,
  "total_vaca": 0,
  "total_touro": 0,
  "total_cria": 0,
  "total_recria": 2,
  "total_engorda": 0,
  "custo_total_lote": 4460.00
}
```

### 7.4 Histórico Sanitário

| Método | Endpoint                                    | Descrição                           |
|--------|---------------------------------------------|-------------------------------------|
| GET    | `/api/animais/{id}/historico-sanitario`      | Listar histórico do animal          |
| POST   | `/api/animais/{id}/historico-sanitario`      | Adicionar registro sanitário        |
| DELETE | `/api/historico-sanitario/{id}`              | Remover registro sanitário          |
| GET    | `/api/historico-sanitario/vacinas`           | Listar vacinas distintas (autocomplete) |

### 7.5 Custos (Resumo por Fazenda)

| Método | Endpoint                         | Descrição                           |
|--------|----------------------------------|-------------------------------------|
| GET    | `/api/fazendas/{id}/custos`      | Obter custos da fazenda             |
| PUT    | `/api/fazendas/{id}/custos`      | Atualizar custos da fazenda         |

**Exemplo de response — GET `/api/fazendas/{id}/custos`:**

```json
{
  "fazenda_id": "uuid-here",
  "id_sistema": 18,
  "nome_fantasia": "FAZENDA ESTIVA",
  "custo_total_lote": 4460.00,
  "total_animais": 2,
  "preco_animal": 2230.00,
  "custo_mensal": 0.00,
  "custo_diario": 0.00,
  "custo_total_animal": 0.00,
  "preco_venda": 0.00,
  "lucro": 0.00
}
```

---

## 8. Navegação e Menu Principal

### 8.1 Estrutura de Navegação

```
┌──────────────────────────────────────────────────┐
│  🐄 FarmsJose                          [👤 User] │
├──────────────────────────────────────────────────┤
│                                                  │
│  📊 Dashboard (Home)                             │
│                                                  │
│  📋 Cadastros                                    │
│     ├── 🏠 Fazendas                              │
│     └── 🐄 Animais                               │
│                                                  │
│  🔍 Consultas                                    │
│     └── 📈 Resumo por Fazenda                    │
│                                                  │
│  ⚙️ Configurações                                │
│     └── 👤 Minha Conta                            │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 8.2 Dashboard (Home) — Tela Inicial

Visão geral do sistema com cards resumo:

| Card                     | Conteúdo                              |
|--------------------------|---------------------------------------|
| Total de Fazendas        | Contagem de fazendas cadastradas      |
| Total de Animais         | Contagem total de animais             |
| Valor Total em Animais   | Soma de todos os preços de compra     |
| Últimos Cadastros        | Lista dos 5 últimos animais/fazendas  |

---

## 9. Validações e Tratamento de Erros

### 9.1 Validações no Frontend (Zod)

```typescript
// Exemplo: Schema de Fazenda
const fazendaSchema = z.object({
  razao_social: z.string().min(3, "Mín. 3 caracteres").max(200),
  nome_fantasia: z.string().min(2, "Mín. 2 caracteres").max(200),
  cnpj: z.string().refine(validarCNPJ, "CNPJ inválido").optional().or(z.literal("")),
  cpf: z.string().refine(validarCPF, "CPF inválido").optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  estado: z.enum(["AC","AL","AP",...,"TO"]).optional(),
  data_cadastro: z.date().max(new Date(), "Data não pode ser futura"),
  // ... demais campos
});
```

### 9.2 Validações no Backend (Pydantic)

```python
# Exemplo: Schema de Fazenda
class FazendaCreate(BaseModel):
    razao_social: str = Field(..., min_length=3, max_length=200)
    nome_fantasia: str = Field(..., min_length=2, max_length=200)
    cnpj: Optional[str] = Field(None, max_length=18)
    cpf: Optional[str] = Field(None, max_length=14)
    email: Optional[EmailStr] = None
    estado: Optional[str] = Field(None, max_length=2)
    data_cadastro: date = Field(default_factory=date.today)

    @validator("cnpj")
    def validar_cnpj(cls, v):
        if v and not is_valid_cnpj(v):
            raise ValueError("CNPJ inválido")
        return v

    @validator("cpf")
    def validar_cpf(cls, v):
        if v and not is_valid_cpf(v):
            raise ValueError("CPF inválido")
        return v
```

### 9.3 Códigos de Erro da API

| Código | Situação                            | Mensagem exemplo                                    |
|--------|-------------------------------------|-----------------------------------------------------|
| 400    | Dados inválidos                     | `{"detail": "CNPJ inválido"}`                       |
| 404    | Recurso não encontrado              | `{"detail": "Fazenda não encontrada"}`              |
| 409    | Conflito (duplicata)                | `{"detail": "CNPJ já cadastrado"}`                  |
| 422    | Entidade não processável            | `{"detail": [{"field": "...", "msg": "..."}]}`      |
| 500    | Erro interno                        | `{"detail": "Erro interno do servidor"}`            |

---

## 10. Segurança

| Aspecto                | Implementação                                                |
|------------------------|--------------------------------------------------------------|
| Autenticação           | JWT com access token (15min) + refresh token (7d)            |
| Senhas                 | Hash com bcrypt (salt rounds = 12)                           |
| CORS                   | Configurado para domínios permitidos                         |
| Rate Limiting          | 100 req/min por IP (login: 5 req/min)                        |
| Input Sanitization     | Pydantic + SQLAlchemy (prevenção SQL Injection)              |
| XSS Prevention         | React já escapa por padrão; CSP headers                      |
| HTTPS                  | Obrigatório em produção                                      |
| Validação dupla        | Frontend (UX) + Backend (segurança)                          |

---

## 11. Estrutura de Pastas do Projeto

```
FarmsJose/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app + CORS + middlewares
│   │   ├── config.py                # Settings (env vars)
│   │   ├── database.py              # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── fazenda.py
│   │   │   ├── animal.py
│   │   │   ├── historico_sanitario.py
│   │   │   └── custo_fazenda.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── fazenda.py           # Pydantic schemas
│   │   │   ├── animal.py
│   │   │   ├── historico_sanitario.py
│   │   │   └── custo_fazenda.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── fazendas.py          # CRUD endpoints
│   │   │   ├── animais.py
│   │   │   ├── historico_sanitario.py
│   │   │   └── custos.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── fazenda_service.py   # Business logic
│   │   │   ├── animal_service.py
│   │   │   └── custo_service.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── validators.py        # CPF, CNPJ validators
│   │       └── pagination.py
│   ├── alembic/                     # Migrations
│   ├── tests/
│   ├── requirements.txt
│   ├── alembic.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── fazendas/
│   │   │   │   ├── FazendaForm.tsx
│   │   │   │   ├── FazendaTable.tsx
│   │   │   │   └── FazendaSearch.tsx
│   │   │   ├── animais/
│   │   │   │   ├── AnimalGrid.tsx
│   │   │   │   ├── AnimalDrawer.tsx
│   │   │   │   ├── AnimalTotais.tsx
│   │   │   │   └── SanitarioTags.tsx
│   │   │   └── resumo/
│   │   │       ├── ResumoCards.tsx
│   │   │       ├── FazendaSelector.tsx
│   │   │       └── LucroIndicator.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CadastroFazendas.tsx
│   │   │   ├── CadastroAnimais.tsx
│   │   │   └── ResumoFazenda.tsx
│   │   ├── hooks/
│   │   │   ├── useFazendas.ts
│   │   │   ├── useAnimais.ts
│   │   │   └── useCustos.ts
│   │   ├── lib/
│   │   │   ├── api.ts               # Axios/fetch config
│   │   │   ├── validators.ts        # CPF, CNPJ, masks
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── EspecificacaoFuncional.md
└── README.md
```

---

## 12. Requisitos Não-Funcionais

| #     | Requisito                                      | Meta                              |
|-------|-------------------------------------------------|-----------------------------------|
| RNF-01| Tempo de resposta da API                        | ≤ 200ms (p95)                     |
| RNF-02| Disponibilidade                                 | 99.5%                             |
| RNF-03| Suporte a usuários simultâneos                  | Mínimo 50                         |
| RNF-04| Compatibilidade de navegadores                  | Chrome, Firefox, Edge, Safari     |
| RNF-05| Responsividade                                  | Desktop, Tablet, Mobile           |
| RNF-06| Backup do banco de dados                        | Diário, retenção de 30 dias       |
| RNF-07| Logs estruturados                               | JSON, com correlação de requests  |
| RNF-08| Testes automatizados (backend)                  | Cobertura mínima 80%             |

---

## 13. Fluxos de Uso

### 13.1 Fluxo: Cadastrar Nova Fazenda

```
1. Usuário acessa Menu > Cadastros > Fazendas
2. Clica em "Nova Fazenda" (ou formulário já aparece limpo)
3. Preenche Razão Social e Nome Fantasia (obrigatórios)
4. Opcionalmente preenche CNPJ → sistema valida dígitos
5. Preenche CEP → sistema busca endereço automaticamente via ViaCEP
6. Completa demais campos desejados
7. Clica em "Salvar"
8. Sistema valida todos os campos
9. Se válido: exibe toast "Fazenda cadastrada com sucesso!" e atualiza tabela
10. Se inválido: destaca campos com erro e exibe mensagens inline
```

### 13.2 Fluxo: Cadastrar Animal

```
1. Usuário acessa Menu > Cadastros > Animais
2. No seletor de fazenda, busca e seleciona a fazenda desejada
3. Sistema carrega animais já cadastrados naquela fazenda
4. Clica em "+ Adicionar Animal"
5. Drawer lateral abre com formulário
6. Preenche: Lote, Identificação, Sexo, Categoria, Idade, Peso, Preço, Origem
7. Adiciona histórico sanitário como tags (digita e pressiona Enter)
8. Informa Data da Primeira Pesagem
9. Clica em "Salvar"
10. Animal aparece na grid; totalizadores são atualizados
11. Custo Total Lote é recalculado
```

### 13.3 Fluxo: Consultar Resumo por Fazenda

```
1. Usuário acessa Menu > Consultas > Resumo por Fazenda
2. Busca e seleciona fazenda
3. Sistema carrega e calcula:
   - Custo Total Lote (soma automática)
   - Total de Animais (count automático)
   - Preço por Animal (calculado)
4. Usuário informa Custo Mensal, Custo Total Animal, Preço Venda
5. Sistema calcula automaticamente Custo Diário e Lucro
6. Lucro exibido em verde (positivo) ou vermelho (negativo)
7. Clica em "Salvar Custos"
8. Dados persistidos
```

---

## 14. Glossário

| Termo              | Definição                                                       |
|--------------------|-----------------------------------------------------------------|
| Fazenda            | Propriedade rural cadastrada no sistema                         |
| Lote               | Agrupamento numerado de animais dentro de uma fazenda           |
| Cria               | Animal jovem, até desmama                                        |
| Recria             | Animal em fase de crescimento pós-desmama                       |
| Engorda            | Animal em fase de ganho de peso para abate                      |
| Histórico Sanitário| Registro de vacinas e procedimentos aplicados ao animal         |
| PE-DEC             | Vacina contra clostridiose (Pé de Decúbito)                     |
| RAIVA              | Vacina contra raiva bovina                                       |
| CARB               | Vacina contra carbúnculo sintomático                             |
| Custo Total Lote   | Soma dos preços de compra de todos os animais de uma fazenda     |
| Preço Animal       | Custo médio por animal (Custo Total Lote / Total de Animais)    |

---

## 15. Cronograma Sugerido (Fases)

| Fase | Descrição                                       | Entregáveis                           |
|------|-------------------------------------------------|---------------------------------------|
| 1    | Setup do projeto + Modelo de dados + Migrations  | Backend base, DB, Docker             |
| 2    | CRUD Fazendas (API + Frontend)                   | Módulo 1 completo                    |
| 3    | CRUD Animais (API + Frontend)                    | Módulo 2 completo                    |
| 4    | Resumo por Fazenda (API + Frontend)              | Módulo 3 completo                    |
| 5    | Dashboard, Auth, Polimento                       | Sistema completo                     |
| 6    | Testes, Deploy, Documentação                     | Produção                             |

---

*Fim da Especificação Funcional — v1.0*
