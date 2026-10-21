# Backlog técnico — PI II

O que falta **neste trimestre**, e o que já está resolvido. Os itens que não
dependem deste trimestre estão em [`future/`](future/README.md) e
[`frozen/`](frozen/README.md).

Estado conferido em 05/10/2026.

## Cobertura dos requisitos do tema

| Requisito | Status | Onde/como |
|---|---|---|
| Framework web | ✅ | Hono (backend) + React (frontend) |
| Banco de dados | ✅ | D1 + Drizzle. O estoque é um **ledger** de movimentos; o saldo é cache reconstruível |
| JavaScript/TypeScript | ✅ | Todo o código novo é TS, com `strict` e `noUnusedLocals` |
| Hospedagem em nuvem | ✅ | Cloudflare Workers, deploy automático na `main` |
| Controle de versão | ✅ | Git + GitHub + PRs, `main` protegida por status check |
| Testes | ✅ | `bun run test` (38 casos do contrato, com D1 de mentira) e `bun run test:inventory` (a suíte do ledger, contra o D1 local). As duas passam, e o `bun run test` está no gate do build |
| Consumo de API externa | ⏳ | ViaCEP — ver [`future/`](future/README.md) |
| Acessibilidade | ⏳ | Parcial: `label` associado e foco visível nas telas; falta teste com axe |

## O que falta fazer

1. ✅ **Banco e API** — as tabelas de domínio e os endpoints existem. A tabela
   `instituicao` não foi criada de propósito: **a instituição é a instância** —
   um deployment, um D1, uma instituição. Ver
   [`frozen/seguranca.md`](frozen/seguranca.md).
2. ✅ **Autenticação** — Better Auth com plugin Organization, login e cadastro
   funcionando.
3. ✅ **As telas dos recursos** — todas as telas existem, nos três modos, e
   consumem o contrato. `beneficiary` é a referência de um contato, `donor`
   aplica a mesma receita, e `inventory/item` e `inventory/category` são
   catálogo. O modelo de estoque ganhou as suas: `inventory/donations` e
   `inventory/delivery` (com a lista de itens no formulário, e os verbos de
   concluir, cancelar e estornar no registro), mais as telas de **saldo**
   (`/inventory/stock`) e de **histórico** (`/inventory/ledger`, a única que
   pagina no servidor). Busca, ordenação e paginação estão nas tabelas,
   reutilizando `components/tables/utils/table-*.ts(x)`; página e ordenação
   ficam na URL e são preservadas ao voltar do detalhe. As receitas estão em
   [`frontend-tabela.md`](frontend-tabela.md) e
   [`frontend-formulario.md`](frontend-formulario.md).
4. ⛔ **Coluna "cadastrado em"** — `beneficiary` não tem nenhuma coluna de data,
   nenhuma das 26. Ordenar por mais recentes e mostrar quando a pessoa foi
   cadastrada depende de uma coluna que o backend congelado não tem, então não
   foi inventada e a ordenação padrão ficou em `nome.asc`. Quando o backend for
   destravado: coluna com default no banco, migration, e `generate.ts`
   produzindo datas em ordem — senão "mais recentes primeiro" sobre o seed
   ordena linhas que nasceram no mesmo instante. A troca na tela é uma linha, o
   `initialSort` de `table-view-state.ts`.
5. ⏳ **Erro de mutation na tela** — hoje o `MutationCache` em
   `lib/query-client.ts` joga no `console` e não há `Alert`, `toast` nem
   `errorMap` por campo para falha de servidor. As mensagens do zod em
   `src/schemas/api/` cobrem validação de campo, mas a API responde em inglês
   via `errors.ts`. O `catch` do `onSubmit` já segura a navegação; falta mostrar a
   mensagem.
6. ⏳ **Fluxo de convite por link** — admin convita, usuário aceita e entra na
   organização. Depende do item 7.
7. ✅ **Multi-tenancy** — **não vai existir, e essa é a decisão.** Uma
   instância do sistema serve **uma** instituição, e outra instituição é outro
   deployment, com o seu próprio banco. Não existe `organization_id` em
   nenhuma tabela de domínio, e nenhuma query filtra por instituição. O
   `organization` do Better Auth **está ativo** e é a isca mais fácil do
   repo, porque parece que o filtro existe. Ele não existe, e não deve.
   Rastreado pela
   [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13); o
   raciocínio, em [`frozen/seguranca.md`](frozen/seguranca.md).
8. ✅ **Redesenho do estoque** — **decidido e implementado**. A primeira
   versão (contadores `on_hand` / `reserved_quantity` e tabelas de linha) saiu;
   o modelo final é um **ledger de movimentos**, com o saldo como cache
   reconstruível e a guarda num trigger do D1. `coleta`/`entrega`/`item` já
   saíram do banco, e `donation_line`/`delivery_line` saíram com a troca. O
   contrato está em [`frozen/modelos-db.md`](frozen/modelos-db.md) e
   [`frozen/api.md`](frozen/api.md); o raciocínio, em
   [`arquitetura.md`](arquitetura.md#o-modelo-de-estoque-virou-ledger). As três
   dúvidas que o desenho original tinha sobre o D1 foram medidas localmente, e
   as três passaram:

   | Dúvida | Resultado |
   |---|---|
   | Coluna gerada `VIRTUAL` | funciona — o valor é calculado, a escrita é recusada no `INSERT` e no `UPDATE`, e recalcula a cada `UPDATE` |
   | `json_each` | existe |
   | `ON CONFLICT` sobre índice único de expressão | funciona, e a dedup por `lower()` vale |

   Consequência: as entradas de um documento entram num statement só, via
   `json_each`, e o saldo é atualizado item a item — são N+2 statements por
   documento. O `WHERE true` é obrigatório —
   `INSERT ... SELECT ... FROM json_each(...) WHERE true ON CONFLICT DO NOTHING` —
   porque sem ele o parser do SQLite não distingue o `ON` do upsert do `ON` de join
   e o statement nem compila (`near "DO": syntax error`).

   E o `db.batch()` devolve um `D1Result` por statement, na ordem, cada um com o seu
   `meta.changes`: uma reserva em que só dois dos três itens tinham estoque devolveu
   `[1, 0, 1]`. O `results[i].meta.changes === 0` do desenho funciona como está
   escrito. `RETURNING` também é aceito pelo D1, como sinal independente.

   **O que segue sem confirmação:** o teto de 50 queries por invocação no plano Free
   é limite de plataforma e só dá para medir no remoto. Com o custo por entrega em
   N+2, é ele que corta os "~45 itens distintos por entrega".

   Uma ressalva: a recusa de escrita na coluna gerada sai como `SQLITE_ERROR` cru,
   que o `handleApiError` não traduz — a mesma classe do `CHECK constraint failed`.
   Não é problema enquanto ninguém escreve nela.

   O rename já foi aplicado, pela migration `20261006192118_mushy_karen_page`:
   `assistido` vira `beneficiary` e `doador` vira `donor`. A migration do ledger,
   `20261020220341_flaky_mysterio`, veio depois, e é a que tira `donation_line` e
   `delivery_line`, cria o `ledger` e a `reconciliation`, e instala o
   `ledger_guard`.

### O que já está feito na branch

1. **O modelo de estoque como ledger** — `ledger` é a fonte da verdade, e o
   saldo em `inventory_item` é cache reconstruível. As duas invariantes
   (cache bate com o ledger; o estoque nunca overcommitou) estão em
   [`frozen/modelos-db.md`](frozen/modelos-db.md#as-duas-invariantes).
2. **A guarda num trigger do D1** — `ledger_guard` aborta a escrita com
   `RAISE(ABORT, 'INSUFFICIENT_STOCK')`, que o D1 devolve como
   `SQLITE_CONSTRAINT_TRIGGER` com a mensagem intacta, e o lote inteiro reverte.
3. **A reconciliação diária** — cron no Worker, duas consultas, e **avisa sem
   bloquear** quando acha divergência. O reparo é reconstruir o cache a partir
   do ledger.
4. **O modelo antigo removido** — `coleta`, `entrega`, `item`, `nome_item` e
   `categoria_item` saíram do schema, dos endpoints e dos casos de teste, pela
   migration `20261001222515_remarkable_wendell_rand`; `assistido` e `doador`
   viraram `beneficiary` e `donor`, pela `20261006192118_mushy_karen_page`.
5. **Seed reescrito** — `scripts/generate.ts` deriva o saldo das movimentações,
   numa simulação em memória, e valida as invariantes antes de devolver;
   `mock_data/catalogo.json` ganhou a `unit` dos 130 itens.
6. **Contrato OpenAPI** — `@hono/zod-openapi` nas rotas, `openapi.json` gerado
   pelo servidor, `schema.d.ts` pelo `openapi-typescript`, e o frontend falando
   com o `openapi-react-query`. O tipo da resposta vem do contrato, não de
   arquivo escrito à mão.
7. **Hono Groups** — as rotas de estoque e de contatos estão em
   `src/worker/routes/{contacts,inventory}/`, uma por recurso, explícitas.
8. **Utilitários de tabela movidos** — `table-features.ts`,
   `table-pagination.tsx`, `table-sortable-header.tsx`, `table-toolbar.tsx` e
   `table-view-state.ts` foram para `src/react-app/components/tables/utils/`.
9. **Telas** — `beneficiaries`, `donors`, `inventory/item`,
   `inventory/category`, `inventory/donations` e `inventory/delivery` existem,
   em `components/tables/{contacts,inventory}/`.

### O que falta

1. ✅ **A implementação do ledger** — a migration que troca as tabelas de linha
   pelo `ledger`, o trigger `ledger_guard`, a reconciliação diária, as rotas
   novas (`/stock`, `/ledger`, `/donations/:id/void`,
   `/deliveries/:id/complete`, `/deliveries/:id/cancel`) e a reescrita das duas
   suítes de teste. Feito em 20/10/2026; o estado está em
   [`estado-atual.md`](estado-atual.md).
2. ✅ **A tela do saldo e a do histórico** — `GET /api/v1/stock` (item, em estoque,
   reservado, disponível) e `GET /api/v1/ledger`, que é a **primeira tela com
   paginação no servidor** do app. As duas existem desde 21/10/2026, em
   `components/tables/inventory/`, e o histórico usa o `ServerPagination`, que é
   dirigido pela URL, e não o `TablePagination`, que conta as linhas do cliente.
3. ✅ **A tabela de itens no formulário de entrega e no de doação** — o que faz a
   entrega reservar estoque. A lista de itens é um campo do formulário, em
   `mode="array"`, e ela é editável **só na criação**: o conteúdo de um
   documento é fixo, e o `PATCH` do cabeçalho não leva os itens.
4. ✅ **Os botões de ação** — concluir entrega, cancelar entrega e estornar
   doação. As transições de estoque não são CRUD: são verbos com a
   `409 INSUFFICIENT_STOCK` ao lado, não abas de um formulário. Eles estão no
   topo do registro, ao lado do "Editar", e só aparecem quando a transição é
   válida.
5. ✅ **O `bun run test` de volta ao gate do build** — `package.json` tem
   `lint && tsc -b && bun run test && vite build` desde 20/10/2026.
6. ✅ **`db-seed` e o caminho do `getPlatformProxy()`** — o `apply --local` e o
   `getPlatformProxy()` do seed conversam, e o seed roda em cima da migration do
   ledger. O seed escreve os movimentos **na mesma ordem que a API** — a entrada
   no ledger e, logo depois, o saldo — porque a guarda mora no trigger, e o
   trigger lê o saldo do item.
7. ✅ **O frontend migrar para o contrato** — feito em 21/10/2026. O
   `src/schemas/zod/` saiu em 20/10/2026 e o frontend migrou no dia seguinte:
   os formulários, as tabelas, as queries e as rotas consomem
   `@/schemas/api/`. Vieram junto as telas de saldo e de histórico, os botões
   de ação do registro e a lista de itens do formulário de documento. O
   `tsc -b` do projeto `app` está limpo.
8. ✅ **Um gerenciador de pacotes só** — o bun, com o `bun.lock` como lockfile
   único. O `package-lock.json` saiu porque ele já estava fora de sincronia
   com o `package.json`, e o `npm ci` falhava com `ERESOLVE`: o
   `openapi-typescript` pede `typescript@^5` e o repo usa o TypeScript 6. O bun
   não impõe a faixa de peer, e `bun install --frozen-lockfile` é o que o CI
   roda.
9. ⏳ **A camada de teste manual** — a coleção do Insomnia saiu em 21/10/2026:
   os 49 requests eram do modelo antigo (`/api/v1/assistidos`, `/coletas`,
   `/entregas`, `/itens`) e carregavam um token de sessão no git. A camada
   manual é hoje o **dev server, no navegador**. Falta um script de *smoke*
   contra ele — o fluxo inteiro do ledger, com sessão de verdade, que é o que as
   suítes automatizadas não cobrem (elas não passam pelo middleware de
   sessão).

## Fora do escopo do MVP

- Google Maps / rotas de coleta (exige faturamento Google e cuidados de LGPD)
- Dashboard com indicadores e análise de dados (requisito opcional do tema)
- Notificações por e-mail/WhatsApp
