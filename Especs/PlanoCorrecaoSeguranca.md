# Plano de Correcao de Backend e Frontend

## Objetivo

Este plano organiza a correcao dos principais riscos identificados na aplicacao, com prioridade para seguranca, controle de acesso, protecao de sessao e resiliencia operacional.

## Criterios de Prioridade

- `P0`: vulnerabilidade critica com risco direto de acesso indevido ou comprometimento total
- `P1`: risco alto com impacto relevante em disponibilidade, vazamento ou quebra de autorizacao
- `P2`: endurecimento de seguranca, consistencia e melhoria de padroes
- `P3`: limpeza tecnica, UX de suporte e prevencao de regressao

## Etapa 1 - Conter riscos criticos de autenticacao e acesso

Prioridade: `P0`

### Objetivos

- remover acessos previsiveis ou reutilizaveis
- impedir forja ou uso indevido de token
- reduzir risco imediato em ambiente de producao

### Itens

1. Remover o seeding automatico do usuario `admin@farmsjose.com` com senha fixa.
2. Trocar o `SECRET_KEY` padrao por obrigatoriedade de configuracao via ambiente.
3. Falhar a inicializacao do backend se `SECRET_KEY` estiver ausente ou usando valor inseguro conhecido.
4. Validar o tipo do token no `get_current_user`, aceitando apenas access token.
5. Parar de emitir `refresh_token` ate existir fluxo real de refresh seguro, ou implementar endpoint de refresh com validacao dedicada.
6. Revisar `.env.example`, `docker-compose.yml` e documentacao para remover segredos e credenciais fracas de exemplo.

### Arquivos provaveis

- [config.py](/D:/Code/FarmsJose/backend/app/config.py)
- [main.py](/D:/Code/FarmsJose/backend/app/main.py)
- [deps.py](/D:/Code/FarmsJose/backend/app/deps.py)
- [security.py](/D:/Code/FarmsJose/backend/app/utils/security.py)
- [auth.py](/D:/Code/FarmsJose/backend/app/routers/auth.py)
- [docker-compose.yml](/D:/Code/FarmsJose/docker-compose.yml)
- [backend/.env](/D:/Code/FarmsJose/backend/.env)
- [.env.example](/D:/Code/FarmsJose/.env.example)

### Criterio de conclusao

- nao existe usuario admin padrao criado automaticamente
- backend nao sobe com segredo inseguro
- refresh token nao autentica chamadas protegidas

## Etapa 2 - Fechar lacunas de autorizacao por modulo e privilegio

Prioridade: `P1`

### Objetivos

- fazer o backend aplicar as mesmas regras que o frontend promete
- limitar configuracoes sensiveis apenas a administradores

### Itens

1. Substituir `get_current_user` por `require_module("animais")` nas rotas do modulo de fazendas, animais, custos e historico, onde a regra de negocio exigir isso.
2. Confirmar se administradores devem ter acesso total de leitura e escrita ou apenas leitura ampliada.
3. Restringir configuracoes SMTP e administrativas para `get_admin_user`.
4. Revisar endpoints de admin para garantir que somente admin execute operacoes sensiveis.
5. Revisar servicos que usam "ownership estrita" para garantir que a politica esta alinhada com o produto.

### Arquivos provaveis

- [fazendas.py](/D:/Code/FarmsJose/backend/app/routers/fazendas.py)
- [animais.py](/D:/Code/FarmsJose/backend/app/routers/animais.py)
- [custos.py](/D:/Code/FarmsJose/backend/app/routers/custos.py)
- [historico_sanitario.py](/D:/Code/FarmsJose/backend/app/routers/historico_sanitario.py)
- [configuracoes.py](/D:/Code/FarmsJose/backend/app/routers/configuracoes.py)
- [deps.py](/D:/Code/FarmsJose/backend/app/deps.py)
- [EspecificacaoFuncional.md](/D:/Code/FarmsJose/Especs/EspecificacaoFuncional.md)
- [EspecificacaoFuncionalModulo2.md](/D:/Code/FarmsJose/Especs/EspecificacaoFuncionalModulo2.md)

### Criterio de conclusao

- usuario sem modulo nao acessa endpoint mesmo chamando API diretamente
- somente admin altera SMTP e configuracoes sensiveis

## Etapa 3 - Endurecer sessao no frontend e armazenamento offline

Prioridade: `P1`

### Objetivos

- reduzir superficie de vazamento no navegador
- impedir mistura de dados entre usuarios no modo offline

### Itens

1. Planejar migracao de `localStorage` para cookies `HttpOnly` se a arquitetura suportar.
2. Se a migracao nao for imediata, encapsular acesso a tokens e minimizar tempo de persistencia.
3. Isolar IndexedDB por usuario ou limpar automaticamente dados offline ao detectar troca de conta.
4. Garantir filtro por `user_id` em todos os fallbacks offline de listagem.
5. Revisar bootstrap offline para nao carregar cache compartilhado antes da autenticacao do usuario.
6. Documentar limite de seguranca do modo offline no produto.

### Arquivos provaveis

- [useAuth.tsx](/D:/Code/FarmsJose/frontend/src/hooks/useAuth.tsx)
- [api.ts](/D:/Code/FarmsJose/frontend/src/lib/api.ts)
- [db.ts](/D:/Code/FarmsJose/frontend/src/lib/db.ts)
- [sync.ts](/D:/Code/FarmsJose/frontend/src/lib/sync.ts)
- [offline-api.ts](/D:/Code/FarmsJose/frontend/src/lib/offline-api.ts)
- [fabrica-offline.ts](/D:/Code/FarmsJose/frontend/src/lib/fabrica-offline.ts)
- [main.tsx](/D:/Code/FarmsJose/frontend/src/main.tsx)

### Criterio de conclusao

- logout e troca de usuario nao reaproveitam cache de outra conta
- dados offline respeitam escopo do usuario autenticado

## Etapa 4 - Tornar o SQL Runner seguro por padrao

Prioridade: `P1`

### Objetivos

- evitar abuso de memoria e consultas perigosas
- manter ferramenta util sem abrir risco desnecessario

### Itens

1. Impor `LIMIT` servidor-side quando ausente.
2. Evitar `fetchall()` em consultas arbitrarias; ler apenas o necessario.
3. Definir timeout de consulta ou estrategia de cancelamento quando viavel.
4. Bloquear acesso a schemas sensiveis ou metadados, se isso nao for requisito real.
5. Reduzir exposicao de mensagens internas do banco nas respostas.
6. Corrigir queries de exemplo quebradas no frontend.

### Arquivos provaveis

- [admin.py](/D:/Code/FarmsJose/backend/app/routers/admin.py)
- [QueryRunnerPage.tsx](/D:/Code/FarmsJose/frontend/src/pages/admin/QueryRunnerPage.tsx)

### Criterio de conclusao

- consultas grandes nao derrubam o processo
- interface admin continua funcional com limites previsiveis

## Etapa 5 - Reforcar politicas de senha, segredos e configuracao

Prioridade: `P2`

### Objetivos

- elevar baseline de seguranca
- reduzir configuracoes inseguras em dev e producao

### Itens

1. Aumentar tamanho minimo de senha e, se possivel, exigir regra basica de complexidade.
2. Revisar custo do bcrypt e alinhar com a especificacao.
3. Validar e sanitizar emails nos schemas que hoje aceitam `str` simples.
4. Remover credenciais hardcoded de compose e exemplos.
5. Desligar `debugpy` e portas sensiveis por padrao fora de desenvolvimento.

### Arquivos provaveis

- [user.py](/D:/Code/FarmsJose/backend/app/schemas/user.py)
- [UsuarioFormPage.tsx](/D:/Code/FarmsJose/frontend/src/pages/admin/UsuarioFormPage.tsx)
- [cliente.py](/D:/Code/FarmsJose/backend/app/schemas/cliente.py)
- [fabrica_unidade.py](/D:/Code/FarmsJose/backend/app/schemas/fabrica_unidade.py)
- [docker-compose.yml](/D:/Code/FarmsJose/docker-compose.yml)
- [requirements.txt](/D:/Code/FarmsJose/backend/requirements.txt)

### Criterio de conclusao

- senhas fracas deixam de ser aceitas
- configuracao insegura passa a ser excecao, nao padrao

## Etapa 6 - Testes de regressao e cobertura minima de seguranca

Prioridade: `P2`

### Objetivos

- evitar que os mesmos problemas retornem
- transformar as regras de seguranca em comportamento testado

### Itens

1. Criar testes de autenticacao para access token e refresh token.
2. Criar testes de autorizacao por modulo.
3. Criar testes para garantir que usuario nao acessa dados de outro usuario.
4. Criar testes para SQL runner com consulta grande, query invalida e tentativa bloqueada.
5. Criar testes para fluxo offline com troca de conta e limpeza de cache.

### Sugestao inicial de pastas

- `backend/tests/auth`
- `backend/tests/authorization`
- `backend/tests/admin`
- `frontend/src/lib/__tests__`

### Criterio de conclusao

- os riscos corrigidos possuem teste automatizado cobrindo o comportamento esperado

## Etapa 7 - Documentacao e rollout controlado

Prioridade: `P3`

### Objetivos

- facilitar implantacao sem regressao operacional
- deixar claro o que muda para time e usuarios

### Itens

1. Atualizar documentacao de setup com novas variaveis obrigatorias.
2. Registrar politica de administracao, modulos e seguranca offline.
3. Criar checklist de deploy seguro.
4. Separar claramente configuracao de desenvolvimento e producao.

### Arquivos provaveis

- [.env.example](/D:/Code/FarmsJose/.env.example)
- [EspecificacaoTecnica.md](/D:/Code/FarmsJose/Especs/EspecificacaoTecnica.md)
- [EspecificacaoFuncionalModulo2.md](/D:/Code/FarmsJose/Especs/EspecificacaoFuncionalModulo2.md)

## Ordem Recomendada de Execucao

1. Etapa 1
2. Etapa 2
3. Etapa 4
4. Etapa 3
5. Etapa 5
6. Etapa 6
7. Etapa 7

## Entregas Sugeridas por PR

### PR 1

- remover admin padrao
- endurecer `SECRET_KEY`
- separar access token de refresh token

### PR 2

- corrigir autorizacao por modulo
- restringir configuracoes SMTP para admin

### PR 3

- endurecer SQL runner
- corrigir exemplos quebrados no frontend admin

### PR 4

- isolar cache offline por usuario
- revisar persistencia de sessao no frontend

### PR 5

- melhorar politica de senha
- limpar configuracoes e exposicoes de desenvolvimento
- adicionar testes

## Observacoes

- Algumas decisoes dependem da regra de produto: especialmente o que um admin pode ler ou editar nos dados de outros usuarios.
- Se quisermos acelerar com menor risco, a melhor primeira entrega e a Etapa 1 inteira antes de qualquer ajuste cosmetico ou de UX.
