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
| Testes | ✅ | `npm test` (38 casos do contrato, com D1 de mentira) e `npm run test:inventory` (a suíte do ledger, contra o D1 local). As duas passam, e o `npm test` está no gate do build |
| Consumo de API externa | ⏳ | ViaCEP — ver [`future/`](future/README.md) |
| Acessibilidade | ⏳ | Parcial: `label` associado e foco visível nas telas; falta teste com axe |

## O que falta fazer

1. ✅ **Banco e API** — as tabelas de domínio e os endpoints existem. A tabela
   `instituicao` não foi criada de propósito: **a instituição é a instância** —
   um deployment, um D1, uma instituição. Ver
   [`frozen/seguranca.md`](frozen/seguranca.md).
2. ✅ **Autenticação** — Better Auth com plugin Organization, login e cadastro
   funcionando.
3. ⏳ **As telas dos outros recursos** — `assistido` é a referência e está nos
   três modos (`/assistidos`, `/assistidos/novo`, `/assistidos/id/$id`).
   `doador` também está nos três modos (`/doadores`, `/doadores/novo`,
   `/doadores/id/$id`), com os 10 campos de identificação e endereço. Vale o
   aviso do item 9: `doador` vira `donor` no redesenho do estoque, então a tela
   nasce com o nome que vai morrer — mas já existe.
   `coleta`, `entrega` e `item` **não ganham tela porque saíram do banco**: o
   modelo de estoque já foi decidido (`inventory_item`, `donation`, `delivery`,
   reserva e ajuste) e implementado nesta branch, em
   [`future/README.md`](future/README.md). As receitas estão em
   [`frontend-tabela.md`](frontend-tabela.md) e
   [`frontend-formulario.md`](frontend-formulario.md). Busca, ordenação e
   paginação já estão nas tabelas de `assistido` e `doador`, reutilizando
   `components/tables/table-*.ts(x)`. Doadores também têm filtro por UF;
   página e ordenação ficam na URL e são preservadas ao voltar do detalhe.
4. ⛔ **Coluna "cadastrado em"** — `assistido` não tem nenhuma coluna de data,
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
   `schema.ts` cobrem validação de campo, mas a API responde em inglês via
   `errors.ts`. O `catch` do `onSubmit` já segura a navegação; falta mostrar a
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
8. ✅ **Redesenho do estoque** — **decidido e em implementação**. A primeira
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

   Consequência: criar N itens numa doação custa **2 statements**, e não 2 por
   linha. O `WHERE true` é obrigatório —
   `INSERT ... SELECT ... FROM json_each(...) WHERE true ON CONFLICT DO NOTHING` —
   porque sem ele o parser do SQLite não distingue o `ON` do upsert do `ON` de join
   e o statement nem compila (`near "DO": syntax error`).

   E o `db.batch()` devolve um `D1Result` por statement, na ordem, cada um com o seu
   `meta.changes`: uma reserva em que só dois dos três itens tinham estoque devolveu
   `[1, 0, 1]`. O `results[i].meta.changes === 0` do desenho funciona como está
   escrito. `RETURNING` também é aceito pelo D1, como sinal independente.

   **O que segue sem confirmação:** o teto de 50 queries por invocação no plano Free
   é limite de plataforma e só dá para medir no remoto. Com o custo por entrega em
   2N, é ele que corta os "~45 itens distintos por entrega".

   Uma ressalva: a recusa de escrita na coluna gerada sai como `SQLITE_ERROR` cru,
   que o `handleApiError` não traduz — a mesma classe do `CHECK constraint failed`.
   Não é problema enquanto ninguém escreve nela.

   O rename já foi aplicado, pela migration `20261006192118_mushy_karen_page`:
   `assistido` vira `beneficiary` e `doador` vira `donor`. A migration do ledger
   vem depois, e é a que tira `donation_line` e `delivery_line`.

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
2. **A tela do saldo e a do histórico** — `GET /api/v1/stock` (item, em estoque,
   reservado, disponível) e `GET /api/v1/ledger`, que é a **primeira tela com
   paginação no servidor** do app.
3. **A tabela de itens no formulário de entrega e no de doação** — o que faz a
   entrega reservar estoque. É o item 4 e o 5 do [`TODO.md`](../TODO.md), ainda
   abertos.
4. **Os botões de ação** — concluir entrega, cancelar entrega e estornar
   doação. As transições de estoque não são CRUD: são verbos com a
   `409 INSUFFICIENT_STOCK` ao lado, não abas de um formulário.
5. ✅ **O `npm test` de volta ao gate do build** — `package.json` tem
   `lint && tsc -b && npm test && vite build` desde 20/10/2026.
6. ✅ **`db-seed` e o caminho do `getPlatformProxy()`** — o `apply --local` e o
   `getPlatformProxy()` do seed conversam, e o seed roda em cima da migration do
   ledger. O seed escreve os movimentos **na mesma ordem que a API** — a entrada
   no ledger e, logo depois, o saldo — porque a guarda mora no trigger, e o
   trigger lê o saldo do item.
7. ⏳ **O frontend migrar para o contrato** — o `src/schemas/zod/` saiu em
   20/10/2026, e o frontend ainda o importa. São 47 erros de tipo, e é o que
   segura o `tsc -b` do projeto `app`. Ver
   [`estado-atual.md`](estado-atual.md#o-frontend-é-o-outro-lado).

## Fora do escopo do MVP

- Google Maps / rotas de coleta (exige faturamento Google e cuidados de LGPD)
- Dashboard com indicadores e análise de dados (requisito opcional do tema)
- Notificações por e-mail/WhatsApp
