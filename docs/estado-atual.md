# Estado atual — branch `mess/but-in-a-good-way`

> **Atualizado em 21/10/2026, depois da migração do frontend.** O modelo de
> estoque **virou ledger** e está implementado dos dois lados: o contrato em
> zod está escrito, o banco tem a tabela do ledger e o trigger da guarda, a API
> está sobre o contrato, e o **frontend** consome o contrato — inclusive as
> telas de saldo e de histórico. As duas suítes de teste passam, e o
> `bun run build` está verde.
>
> O contrato continua em [`frozen/modelos-db.md`](frozen/modelos-db.md) e
> [`frozen/api.md`](frozen/api.md), e o raciocínio da troca, em
> [`arquitetura.md`](arquitetura.md#o-modelo-de-estoque-virou-ledger).

Fotografia do código depois da migração do frontend para o contrato, com o
que está pronto, o que está quebrado e o que ainda precisa ser decidido.

Estado conferido em 20/10/2026.

Este documento **descreve** o estado; não é um contrato. O contrato de API e de
banco continua em [`frozen/`](frozen/README.md). A lista do que falta para o
trimestre é [`backlog-pi2.md`](backlog-pi2.md).

## Onde a branch está

A API é escrita à mão por recurso, sobre `@hono/zod-openapi`, e o contrato
vive em zod escrito à mão:

```
src/schemas/api/*                 contrato em zod, escrito à mão
  → src/schemas/db/*               tabelas Drizzle (seguem o contrato)
  → src/worker/routes/{contacts,inventory}/*   rotas OpenAPI, uma por recurso
  → openapi.json  →  src/schemas/openapi/schema.d.ts   (openapi-typescript)
  → src/react-app/lib/queries/{contacts,inventory}/*   (openapi-react-query, $api)
```

O `openapi.json` é gerado do zod, e agora tem **16 schemas nomeados** em
`components/schemas` — `Beneficiary`, `BeneficiaryList`, `Donor`,
`DonorList`, `InventoryItem`, `ItemCategory`, `Donation`, `DonationList`,
`Delivery`, `DeliveryList`, `InventoryCount`, `InventoryCountList`,
`InventoryAdjustment`, `InventoryAdjustmentList`, `Stock` e `LedgerPage` — e
**21 rotas**. Antes eram 0 schemas nomeados.

O `src/schemas/zod/` **saiu**. Ele era o último elo entre o banco e o
contrato, e ele era derivado da tabela: derivar o schema da API da tabela faz
a API virar um despejo do banco, e a lista passa a devolver a linha inteira —
endereço incluído.

## O que o ledger trouxe

| Antes | Agora |
|---|---|
| `on_hand` / `reserved_quantity`, escritos direto | `ledger` de movimentos, com o saldo como **cache** |
| `donation_line`, `delivery_line`, `inventory_count_line` | saíram: o conteúdo de um documento se lê no ledger por `ref_id` |
| overcommit conferido no código | **trigger do D1** (`ledger_guard`), com quatro regras |
| `POST /donations/:id/receive` | saiu: a entrega do estoque é a própria criação |
| `DELETE` em doação e entrega | saiu: o caminho é estornar (`POST /donations/:id/void`) |
| — | `GET /api/v1/ledger`, paginado no servidor |

## O estado do build

| Gate | Resultado |
|---|---|
| `bun run lint` | **zero erro** |
| `tsc -b` (projeto `worker`) | **zero erro** |
| `tsc -b` (projeto `node`) | **zero erro** |
| `tsc -b` (projeto `app`) | **zero erro** |
| `bun run test` | **passa** — 38 casos de contrato |
| `bun run test:inventory` | **passa** — a suíte do ledger, contra o D1 local |
| `bun run build` | **verde** — `lint && tsc -b && bun run test && vite build` |

O `bun run test` **voltou ao gate do build**: `package.json` agora é
`lint && tsc -b && bun run test && vite build`.

## A camada de erro

`src/worker/api/errors.ts` reescrito, e ele é o que faz o envelope existir:

- `ApiError` é uma classe própria, e não um `HTTPException`. O
  `handleApiError` precisa distinguir "a API recusou" (que tem código e
  mensagem) de "o Hono recusou" (content-type errado, JSON malformado).
- `errorFromIssue` reconstrói a frase em inglês a partir do `issue.code`, e
  ignora o `issue.message` — que é em português, e serve ao formulário.
- O ramo de `SQLITE_CONSTRAINT_TRIGGER` traduz a mensagem do trigger
  (`INSUFFICIENT_STOCK`, `NEGATIVE_STOCK`, `INVALID_RELEASE`) para `409`.
- `readJsonObject` dá o `415` e o `INVALID_JSON`; o `INVALID_BODY` vem do
  zod, quando o corpo é JSON mas não é objeto.
- `app.onError(handleApiError)` e `app.notFound(...)` voltaram.

**A resposta é validada contra o contrato antes de sair.** O `.strict()` do
schema de resposta é o que reprova uma lista carregando campo a mais — sem
ele, o zod descarta o campo e o bug passa. Isso pegou três bugs de verdade
durante a implementação: as listas de beneficiário, doador e ajuste estavam
selecionando todas as colunas, e a validação estrita acusou.

## O que o trigger ganhou

O `REVERSE` entrou na regra do `NEGATIVE_STOCK`, e foi a suíte do ledger que
achou: **estornar uma doação cuja mercadoria já foi entregue levava o saldo
abaixo de zero**, e a segunda invariante — a que prova que o estoque nunca
overcommitou — deixava de valer. A regra agora é
`on_hand + delta < reserved + reserved_delta`, e o estorno de uma doação
inteira devolve o físico.

## O frontend migrou para o contrato

O frontend consome `@/schemas/api/` — o contrato — e não o `src/schemas/zod/`,
que saiu. A migração mudou o que o frontend **é**:

| Antes | Agora |
|---|---|
| `src/schemas/zod/<área>` | `@/schemas/api/<recurso>` |
| `<tabela>InsertSchema` | `<recurso>CreateSchema` — o corpo do `POST` |
| `<tabela>UpdateSchema` | `<recurso>UpdateSchema` — o corpo do `PATCH` |
| `<tabela>SelectSchema` | `<recurso>Schema` — a resposta do detalhe |
| `BeneficiaryTableView` (um `Pick`) | `BeneficiaryList` — a linha **é** o schema da lista |
| `inventoryItemId` | `itemId` |
| `/api/v1/inventory/item` | `/api/v1/inventory/items` (no plural) |
| `delivery.lines` | `delivery.items` — `{ itemId, quantity }` |
| `reservedQuantity` | `reserved` |

E o que o contrato mudou no frontend:

- **O envelope.** Toda resposta vem em `{ data }`, e o `select` da query
  desembrulha. O `select` precisa aguentar o `null` — a resposta de erro não
  tem envelope, e o `401` é a única que não tem corpo — e é o
  `semEnvelope` de `lib/queries/fetch-client.ts` que faz isso.
- **A data é ISO 8601.** O `DateField` fala a string do contrato, e não um
  `Date`: o estado do formulário é o payload.
- **O conteúdo do documento é fixo.** A lista de itens do formulário de
  doação e de entrega é editável **só na criação** — depois disso, corrigir é
  estornar e recriar. E o `PATCH` do cabeçalho não leva os itens.
- **O saldo não vem do formulário.** O item nasce com o saldo zerado, e ele
  só se move pelas operações de estoque.

### As telas novas

| Tela | Rota | O que é |
|---|---|---|
| Saldo do estoque | `/inventory/stock` | o saldo de cada item: físico, reservado e disponível |
| Histórico do estoque | `/inventory/ledger` | todos os movimentos, **paginado no servidor** |

O histórico é a **única** tela que pagina no servidor: é a única tabela que
cresce sem limite, porque um histórico de movimentos tem uma linha por
operação, para sempre. O resto recebe a tabela inteira e filtra no cliente.

### Os verbos na tela

O `POST /donations/:id/void`, o `POST /deliveries/:id/complete` e o
`POST /deliveries/:id/cancel` viraram botões na tela do registro, ao lado do
"Editar" — a pessoa está olhando a entrega e quer concluí-la, não editar o
cabeçalho.

### A interface está em pt-BR

A navegação, os títulos, os rótulos de coluna, os botões e as mensagens de
erro de campo estão em português. O enum continua em inglês no banco e no
contrato, e a tela mostra a tradução.

## O seed

`scripts/generate.ts` e `scripts/seed.ts` reescritos para o ledger. O
gerador **não sorteia saldo**: ele sorteia os **movimentos** — doações,
entregas, contagens, ajustes — e deriva o saldo, aplicando cada movimento
numa simulação em memória. O `inventory_item` é escrito no fim, com o
resultado.

Duas consequências, e as duas valem:

- o gerador só sorteia uma entrega para item que tem disponibilidade, então
  ele respeita a mesma guarda que a API;
- e ele **valida as duas invariantes antes de devolver**, então um seed que
  produzisse drift falharia em vez de escrever.

O seed escreve os movimentos **na mesma ordem que a API** — a entrada no
ledger e, logo depois, o saldo — porque a guarda mora no trigger, e o
trigger lê o saldo do item. Sem essa ordem, o trigger veria o saldo zerado e
recusaria a primeira reserva.

## Os testes

`tests/api.ts` é a suíte do **contrato**: 38 casos, com um stub de D1 em
memória, cobrindo o envelope, os códigos de erro e as regras de validação. As
rotas rodam de verdade.

`tests/inventory.ts` é a suíte do **ledger**, contra o D1 local: o
`RECEIVE`, o `RESERVE`, o `ISSUE`, o `RELEASE`, o `REVERSE`, o `COUNT` e o
`ADJUST`, com as duas invariantes conferidas a cada passo, a integridade do
`ref_id` (que não é uma FK, e por isso é uma consulta) e o `id` em minúscula
em toda coluna de chave.

## O que ainda falta

1. **A tela da contagem e do ajuste.** A API tem `POST /inventory-counts` e
   `POST /inventory-adjustments`, e o `GET` das duas listas, mas não há tela
   — nem formulário. O `GET /inventory-counts` e o
   `GET /inventory-adjustments` existem e não têm rota no frontend.
2. **O `POST /api/v1/inventory/rebuild`** exposto, ou só script (decisão
   pendente, ver abaixo).
3. **A reconciliação visível.** A reconciliação roda no cron, avisa no
   `console.error` e grava na tabela `reconciliation` — mas não há tela que
   mostre a última execução.
4. **A camada de teste manual.** A coleção do Insomnia foi removida em
   21/10/2026: os 49 requests apontavam para endpoints do modelo antigo
   (`/api/v1/assistidos`, `/coletas`, `/entregas`, `/itens`), e o mesmo token
   de sessão estava escrito em todos eles. A camada manual agora é o **dev
   server, no navegador** — e um script de *smoke* contra ele (o fluxo inteiro
   do ledger, com sessão de verdade) é o item aberto.
5. **O acabamento das telas.** São sete coisas de tela, listadas em
   [`backlog-pi2.md`](backlog-pi2.md#o-acabamento-das-telas): o erro de
   mutation na tela, o select de item buscável e em ordem alfabética, o
   disponível do item com o teto da quantidade, o histórico do item no
   detalhe, a formatação brasileira de data e telefone, e a ordenação padrão
   de cada tabela. A coluna de doador e de beneficiário na tabela do
   documento já está feita.

## A limpeza de 21/10/2026

O repo foi auditado de ponta a ponta, e o que não tinha mais serventia saiu:

| Saiu | Por quê |
|---|---|
| `package-lock.json` | Estava fora de sincronia com o `package.json` — o `npm ci` falhava com `ERESOLVE`. O bun é o gerenciador, e o `bun.lock` é o lockfile |
| `openapi2.json`, `openapi3.json` | Restos de uma exploração de outubro: um "Inventory Items API" em OpenAPI 3.0, que não descreve nada do repo |
| `scripts/update-openapi.ts`, `scripts/update-openapi.sh` | Substituídos por `scripts/openapi.ts`, que monta o app e chama o `getOpenAPI31Document` — sem servidor |
| `src/worker/api/{resource,v1,inventory}.ts` | 21 KB **100% comentados** — a fábrica genérica de CRUD e as rotas de estoque do modelo antigo, que o ledger substituiu |
| `src/react-app/lib/utils.ts` | Só reexportava o `cn`, que ninguém importava: os 25 usos vêm do pacote `cn` |
| `insomnia/` | Os 49 requests eram de um modelo que não existe mais, e carregavam um token de sessão no git |
| `local-db-init`, `remote-db-init` | Duas implementações paralelas de `scripts/db-init.js`. Ficou só o script, que tem `--force` e avisa sobre produção |
| `@tanstack/react-query-devtools`, `chanfana`, `randexp` | Nenhuma referência no código |
| `miniflare`, `sharp` (direto) | Já vinham como dependência transitiva, em versão idêntica. O `sharp` continua preso pelo `overrides`, que é o que importa |

O `errorSchema` do contrato não foi removido: ele **entrou em uso**. Toda
resposta de erro das rotas agora declara o envelope
`{"error": {"code": "…", "message": "…"}}` no `openapi.json`, e o contrato
publicado diz o que o cliente recebe.

## Uma questão de governança

O [`AGENTS.md`](../AGENTS.md) autoriza levantar o congelamento do backend
na branch `mess/but-in-a-good-way`, e essa autorização foi usada — o modelo
inteiro de estoque foi trocado. Em compensação, duas decisões da
[seção de governança](#as-decisões-na-ordem-de-dependência) continuam
abertas, e ambas são do backend:

- **Doação sem `DRAFT`** — consequência de "conteúdo fixo na criação": uma
  doação nasce quando a mercadoria chega. Se for preciso declarar uma doação
  futura, entra depois de forma aditiva.
- **`POST /api/v1/inventory/rebuild` exposto como endpoint, ou só script?**
  Ele reescreve o saldo de todo item, e o modelo de papéis ainda não existe.

E uma terceira, que é do **seed**: ele valida cada linha contra o schema do
contrato e escreve direto no banco. Passar pela API seria melhor — a
validação passa a ser a do contrato e o ledger nunca nasce inconsistente —
mas é uma reescrita, e o seed atual já respeita a guarda e as duas
invariantes.

## As decisões, na ordem de dependência

> ✅ **Respondidas em 19/10/2026 e implementadas em 20/10/2026.** O modelo de
> estoque é um **ledger** de movimentos, com o saldo como cache reconstruível;
> a guarda é um **trigger do D1**; o conteúdo de um documento é **fixo na
> criação**; a reconciliação roda **uma vez por dia** e avisa sem bloquear. O
> contrato está em [`frozen/`](frozen/README.md).

1. ~~**As tabelas de linha ficam?**~~ → **Não.** `donation_line` e
   `delivery_line` saíram: o conteúdo de um documento se lê no ledger filtrando
   por `ref_id`, e as tabelas podem ser reconstruídas do ledger depois — o
   inverso não.
2. ~~**Um nome só para a chave estrangeira**~~ → **`itemId`**, em db, zod,
   rotas, queries, testes e seed.
3. ~~**Uma forma só para o detalhe**~~ → **O ledger é a linha.** Não há
   tabela de linha, então não há "forma do detalhe" para acertar.
4. ~~**Onde mora a validação agora?**~~ → **No zod do contrato, na borda, com o
   contrato de erro reescrito.** O envelope `{"data": ...}` /
   `{"error": {...}}` e a lista fechada de códigos continuam, e a camada de erro
   ganha um ramo para o trigger.
5. ~~**O contrato vem do banco ou é escrito à mão?**~~ → **Escrito à mão**, em
   `src/schemas/api/`. O `drizzle-orm/zod` saiu: derivar o schema da API da
   tabela faz a API virar um despejo do banco, e a lista passa a devolver a
   linha inteira — endereço incluído. O `openapi.json` é **gerado** desse zod, e
   o formato publicado é OpenAPI 3.1. Ver
   [`arquitetura.md`](arquitetura.md#o-contrato-da-api-vem-primeiro).
6. ~~**Mutação na camada de query ou no formulário?**~~ → **No formulário, com
   `$api.useMutation`**, como já estão `item` e `beneficiary`.
7. ~~**Uma convenção só de nomes**~~ → **`xxxOptions` para ler, `xxxMutation()`
   para escrever**, que é o que o `openapi-react-query` dá.
8. ~~**Plano de teste**~~ → **`tests/api.ts` reescrito para o modelo novo,
   `tests/inventory.ts` reescrito como suíte do ledger, e `bun run test` de volta
   ao gate do build.**
9. ~~**Documentação**~~ → **Feita**: `frozen/`, `arquitetura.md`, este
   documento, `AGENTS.md` e os dois documentos de frontend.
10. ~~**Banco local**~~ → **Sincronizado.** A migration do ledger está aplicada
    no D1 local, e o seed roda em cima dela.

### Pendências do banco

1. **O banco remoto ainda não recebeu a migration do ledger.** E ele não pode
   receber por um caminho incremental: as migrations do repo foram **regeradas**
   três vezes desde que o remoto foi criado, e o `d1_migrations` dele carrega os
   **nomes antigos**. Aplicar por cima tentaria rodar a primeira migration de
   novo, e ela falharia com "table assistido already exists".
   O caminho é o do zero, e é um comando:

   ```bash
   bun run db-reset-remote
   ```

   Ele apaga todas as tabelas do remoto — inclusive a de bookkeeping —, aplica
   as cinco migrations na ordem, e semeia. O passo de apagar é o
   `bun run db-wipe --remote`, que lê o schema do próprio banco para derrubar
   os filhos antes dos pais, porque o D1 recusa `DROP TABLE` de uma tabela que
   outra referencia.
2. **A migration do ledger muda `beneficiary` e `donor`** (o `telefone`, o
   `bairro`, a `cidade` e a `uf` viram `NOT NULL`), e o D1 **recusa**
   `DROP TABLE` de uma tabela que outra referencia. A migration renomeia a
   tabela antiga, cria a nova, copia e só então derruba a antiga — e é por
   isso que ela é mais comprida do que o `drizzle-kit` geraria sozinho.
