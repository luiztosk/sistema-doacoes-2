# Estado atual — branch `mess/but-in-a-good-way`

> **Atualizado em 19/10/2026, depois da decisão do modelo.** Este documento
> começou como a auditoria do branch e virou a base da decisão: o **modelo de
> estoque virou ledger**. O contrato novo está em
> [`frozen/modelos-db.md`](frozen/modelos-db.md) e
> [`frozen/api.md`](frozen/api.md), e o raciocínio da troca, em
> [`arquitetura.md`](arquitetura.md#o-modelo-de-estoque-virou-ledger).
>
> A seção **"As decisões"**, mais abaixo, está respondida. O que **sobrou** está
> em [Pendências](#pendências).

Fotografia do código no momento em que a branch foi reescrita de ponta a ponta, com
o que está em andamento, o que está quebrado e as decisões que ainda precisam ser
tomadas.

Estado conferido em 19/10/2026.

Este documento **descreve** o estado; não é um contrato. O contrato de API e de
banco continua em [`frozen/`](frozen/README.md) — que, como se vê adiante, está
desatualizado. A lista do que falta para o trimestre é
[`backlog-pi2.md`](backlog-pi2.md).

## Onde a branch está

A branch reescreveu a arquitetura do backend inteiro. Antes, a API era uma
fábrica genérica: `registerResource` gerava as cinco rotas de cada recurso, e um
tradutor próprio (`errorFromIssue`) convertia issue de zod em código de erro. Agora
a API é escrita à mão por recurso, sobre `@hono/zod-openapi`, e o zod alimenta a
geração do OpenAPI:

```
src/schemas/db/*                    tabelas Drizzle
  → src/schemas/zod/*               schemas zod (createInsertSchema/createSelectSchema)
  → src/worker/routes/{contacts,inventory}/*   rotas OpenAPI, uma por recurso
  → openapi.json  →  src/schemas/openapi/schema.d.ts   (openapi-typescript)
  → src/react-app/lib/queries/{contacts,inventory}/*   (openapi-react-query, $api)
```

O contrato entre frontend e backend passou a ser o `openapi.json`: o cliente é
gerado a partir dele, e o tipo da resposta é o tipo do schema. Isso elimina a
duplicação de tipos que existia entre `lib/api/` e o schema zod, ao custo de
acoplar o frontend ao formato do OpenAPI.

Junto disso veio o redesenho do modelo:

| Antes | Agora |
|---|---|
| `assistido` (25 colunas) | `beneficiary` |
| `doador` | `donor` |
| `coleta` | `donation` |
| `entrega` | `delivery` |
| `item` | `inventory_item` |

E seis telas novas: `contacts/beneficiaries`, `contacts/donors`, `inventory/item`,
`inventory/category`, `inventory/donations` e `inventory/delivery`.

### O que está em andamento e não foi commitado

Catorze arquivos modificados e um diretório novo (`src/schemas/zod/inventory/`),
que é uma segunda passada sobre o que já estava commitado:

- `src/schemas/zod/inventory.ts` (um arquivo) virou um diretório, um arquivo por
  tabela, com `index.ts` reexportando.
- As rotas do worker passaram a importar o schema com namespace (`dbSchema.item`)
  em vez de importar cada tabela pelo nome.
- O detalhe de `donation` e `delivery` mudou de `{...linha, lines}` para
  `{linha, lines}` — aninhado.
- O endpoint de item mudou de `/api/v1/inventory/items` para
  `/api/v1/inventory/item`.
- `beneficiaryTableOptions` virou `beneficiariesOptions`.

## O estado do build

| Gate | Resultado |
|---|---|
| `npm run lint` | **1 erro** — `'primaryKey' is defined but never used` em `src/schemas/db/inventory.ts:5` |
| `tsc -b` | **72 erros** — 57 no projeto `worker`, 15 no projeto `app` |
| `npm test` | **exit 1** — quebra em `JSON.parse` ao ler `"404 Not Found"` |
| `npm run test:inventory` | **exit 1** — `no such table: doador` |
| `npm run build` | falha no lint, antes de chegar no `tsc` |

E um detalhe do gate: `package.json:82` é `lint && tsc -b && vite build`. **O
`npm test` saiu da cadeia.**tanto o [`AGENTS.md`](../AGENTS.md) quanto
[`arquitetura.md`](arquitetura.md) ainda afirmam que um teste vermelho impede o
deploy — não impede mais, porque o teste não roda no build.

## A inconsistência central: o schema do banco foi revertido, o resto não

Esta é a origem de quase todo o resto. O diff não commitado de
`src/schemas/db/inventory.ts` **apaga** do schema:

- as tabelas `donation_line`, `delivery_line` e `inventory_count_line`;
- `inventory_item.reserved_quantity` e a coluna gerada `available`;
- e renomeia `inventory_adjustment.inventory_item_id` para `item_id`, além de
  tornar `delivery.occurred_at` anulável.

Mas as outras três camadas continuam assumindo que essas tabelas existem:

| Camada | O que ainda espera o modelo com linhas |
|---|---|
| Zod | `src/schemas/zod/inventory/delivery.ts:4` importa `deliveryLine`; `donation.ts:4` importa `donationLine`; `inventory-count.ts:4` importa `inventoryCountLine`; `item.ts:15` refina `reservedQuantity` |
| Worker | `src/worker/routes/inventory/delivery.ts:69-73,148,163-167` usa `dbSchema.deliveryLine` e `dbSchema.item.reservedQuantity`; `donation.ts:5` e `inventory-count.ts:5` importam as tabelas de linha |
| Frontend | `src/react-app/components/tables/inventory/item.tsx:102,115` lê `reservedQuantity` e `available` |

Ou seja: a camada de banco descreve **`donation`/`delivery` só com cabeçalho**, e
zod, worker, OpenAPI e frontend descrevem **`donation`/`delivery` com linhas e
reserva**. As duas leituras não podem estar certas ao mesmo tempo, e escolher uma
derruba a maior parte dos 72 erros de uma vez.

**E há um segundo desacordo de nome dentro do mesmo refactor.** O `delivery_line`
do `HEAD` usava `inventory_item_id`; o `deliveryLine` novo do schema zod espera
`itemId`; e `tests/inventory.ts` e `lib/queries/inventory/donations.ts` ainda
usam `inventoryItemId`. São três nomes para a mesma chave estrangeira.

## As outras inconsistências

### Frontend

**O contrato do detalhe não bate com o formulário.** `DeliveryForm` declara a
prop como `DeliveryWithLinesSelect` — que é `{delivery, lines}` — mas a rota
`inventory/delivery/$id.tsx` passa `delivery={linha} lines={linhas}`, achatado.
E `inventory/delivery/new.tsx:6` passa `<DeliveryForm />` sem prop nenhuma, o
que dá `TS2739`. Pior: com `delivery` obrigatória, `useState(!delivery)` deixa
`isEditing` permanentemente `false` no modo de criação.

**O formulário de doação nunca grava.** `donation.tsx:26-32` monta
`initialValues` com `{donorId, occurredAt, note}`, mas `DonationFormValues`
exige `id` — `TS2322`. E `donation.tsx:47` faz
`if (!donationInsertSchema.safeParse(value).success) return;`: como a validação
sempre falha, o `return` silencioso aborta o `onSubmit` e **a mutation nunca
dispara, sem mensagem nenhuma na tela**.

**Tipo de `occurredAt` inconsistente.** `donation.tsx:29` faz
`new Date(Number(record.occurredAt) * 1000)` — trata o valor como número unix —
mas o schema de select devolve `Date`. E `deliveryInsertSchema` declara
`z.coerce.date().optional()`, enquanto o `DateField` do formulário quer
`Date | null` (`TS2322` em `delivery.tsx:82`).

**Nenhum dos dois formulários tem a tabela de linhas.** O `lines` chega no
formulário de entrega e é descartado. É o item 4 e o item 5 do
[`TODO.md`](../TODO.md), ainda abertos.

**A camada de query está meio migrada.**

| Problema | Onde |
|---|---|
| Aponta para `/api/v1/inventory/items`, e o `openapi.json` diz `/api/v1/inventory/item` | `lib/queries/inventory/items.ts:3,8` — `TS2554`, `TS2345` |
| O tipo `Delivery` foi removido, e a tabela ainda o importa | `lib/queries/inventory/deliveries.ts` e `components/tables/inventory/deliveries.tsx:6` — `TS2305` |
| `createItemMutation` não existe no arquivo de queries, e a rota o importa | `routes/_authenticated/inventory/item/new.tsx:4` — `TS2305` |
| As mutations de beneficiário e doador estão comentadas; os formulários chamam `$api.useMutation` por conta própria | `lib/queries/contacts/beneficiaries.ts:19-22`, `lib/queries/contacts/donors.ts` |
| A rota passa `createMutateAsync` como prop, contra a regra do próprio doc | `routes/_authenticated/inventory/item/new.tsx:11-13` |
| O union do `fkOptions` não bate com nenhum caminho real da API | `lib/fk-factory.ts:7` — `"beneficiaries" \| "doadores" \| "inventory-items" \| "item-categories"` |
| Não existe `deleteXxxMutation` em lugar nenhum, e a API expõe `DELETE` em todo recurso | — |

**A interface visível não está em português do Brasil.** `donations/index.tsx`
mostra "Donations" e "New donation"; os formulários de item e entrega mostram
"Back"; "Identificacao", "Beneficiario", "Observacao" e "Detalhes da entrega"
estão sem acento. E o acento é inconsistente entre tabelas: `donations.tsx:73`
tem "Observação" e `deliveries.tsx:36` tem "Observacao".

### Contrato da API

O contrato de [`frozen/api.md`](frozen/api.md) foi reescrito sem que o
documento acompanhasse:

- **O envelope `{"data": ...}` sumiu.** As rotas devolvem JSON cru.
- **`app.onError(handleApiError)` e `app.notFound(...)` estão comentados** em
  `src/worker/index.ts:29-32`. Um erro do D1 vira um `500` cru do Hono, sem
  `{error: {code, message}}`.
- **`errorFromIssue` e `parseBody` estão comentados** em
  `src/worker/api/errors.ts:58-101` e `:103-122`. Os códigos `REQUIRED_FIELD`,
  `UNKNOWN_FIELD`, `READ_ONLY_FIELD` e `EMPTY_UPDATE` não são emitidos por
  ninguém.
- **Não sobrou validação no servidor.** O zod agora alimenta a geração do
  OpenAPI, e quem valida é o `openapi-react-query`, no cliente. Uma chamada
  direta à API passa sem validação nenhuma.
- `src/worker/api/{v1,resource,inventory}.ts` estão quase inteiros comentados
  (29/32, 134/159 e 518/606 linhas), e o [`AGENTS.md`](../AGENTS.md) ainda os
  documenta como a arquitetura viva.

### Testes

- **`tests/api.ts` está morto duas vezes.** Os 28 casos apontam para endpoints
  que não existem mais (`/api/v1/assistidos`, `/api/v1/coletas`,
  `/api/v1/itens`), e `registerResources(api)` está comentado em
  `tests/api.ts:66` — o app do Hono fica vazio, todo request dá 404, e o runner
  quebra em `JSON.parse`.
- **`tests/inventory.ts` é o teste de verdade** das sete operações de estoque,
  contra o D1 local, com as duas invariantes conferidas a cada passo. Mas
  `registerResources(api)` está comentado em `tests/inventory.ts:9`, ele usa o
  nome antigo `inventoryItemId`, e o D1 local não tem as tabelas
  (`no such table: doador`).

### Seed e geração

`scripts/seed.ts:13,15,17` importa `donationLine`, `deliveryLine` e
`inventoryCountLine`. `scripts/generate.ts:26-27` importa
`inventoryItemSelectSchema` e `itemCategorySelectSchema` — que hoje são
`itemSelectSchema` e `categorySelectSchema` — e `scripts/generate.ts:49` chama
`getTableColumns(inventoryItem)`, cujo export é `item`.

**Isso está escondido.** O diff não commitado de `tsconfig.worker.json` adiciona
`"exclude": ["scripts"]` e tira `scripts/seed.ts` e `scripts/generate.ts` do
`include`. O `tsc -b` para de reclamar do seed enquanto o seed continua
quebrado. Vale decidir se o carve-out é de propósito.

### Estilo

Contra as regras do [`AGENTS.md`](../AGENTS.md):

| Regra | Onde está violada |
|---|---|
| Tabs, não espaços | `src/schemas/zod/inventory/*.ts` — 4 espaços em todos os seis arquivos |
| Aspas duplas | `src/worker/routes/inventory/*.ts` — aspas simples |
| Zero comentário de código | `forms/inventory/delivery.tsx:76,81` e `forms/inventory/donation.tsx:18-22` |
| Interface em pt-BR | ver seção de frontend |

Dois caminhos de script estão errados:

- `package.json:91` — `gen-auth` escreve em `./schemas/db/auth.ts`. Falta o
  prefixo `src/`.
- `scripts/update-openapi.sh:20` — escreve em `./src/openapi/schema.d.ts`. Falta
  o `schemas/`. O `update-openapi.ts` está certo; o `.sh` é uma cópia
  desatualizada do mesmo script.

### Documentação

O [`AGENTS.md`](../AGENTS.md) e os documentos de frontend descrevem uma
arquitetura que não existe mais:

> ✅ **Resolvido em 19/10/2026.** Tudo o que está na tabela abaixo foi
> corrigido: o `AGENTS.md` reescrito, os dois documentos de frontend
> reapontados, o `frozen/` reescrito para o ledger, o
> `inventory-pattern.md` movido para o arquivo, e o `backlog-pi2.md`
> atualizado. A coluna da direita está como a auditoria encontrou.

| Documento | O que está errado |
|---|---|
| `AGENTS.md` | 8 das 12 linhas da tabela "Layout" apontam para caminhos que sumiram: `src/worker/db/schema.ts`, `src/worker/db/seed.ts`, `src/worker/db/generate.ts`, `src/worker/db/auth-schema.ts`, `src/react-app/lib/api/`, `src/react-app/hooks/use-mobile.ts`, `components/tables/assistidos.tsx`, `components/forms/assistido.tsx`. Também afirma que o backend está congelado (não está mais) e que o `npm test` está no gate do build (não está). |
| `AGENTS.md` | A convenção de nomes de query está errada: o doc exige `<entidade>Options` e `create<Entidade>Options`; o código usa `<entidade>Options` para ler e `create<Entidade>Mutation()` para escrever. |
| `frontend-tabela.md` | Nomeia `assistido` como o arquivo a espelhar. Ele não existe. A referência real, pelo commit `1d34ee7`, é `components/tables/inventory/item.tsx`. |
| `frontend-formulario.md` | Mesmo problema com `assistido` e com `lib/api/`. Diz que `SelectField` alimentado por outra lista "não tem exemplo" — existe, em `forms/inventory/delivery.tsx:76`, com o `fkOptions`. E diz para validar sempre com o `*InsertSchema`, enquanto o código usa o `*UpdateSchema` no modo de edição. |
| `frozen/` | Descreve 9 tabelas de estoque, `assistido`/`doador`, o envelope `{"data"}`, 14 códigos de erro e `src/worker/db/schema.ts` como fonte do schema. |
| `inventory-pattern.md` | **Órfão**: não está no índice do `docs/README.md` e não é referenciado por nada. Além disso, manda "no `useQuery`/`useMutation` in routes", que é o oposto do que as rotas fazem. |
| `backlog-pi2.md` | "O que falta #1" (rename de `assistido` para `beneficiary`) e "#2" (telas do estoque) já foram feitos. |

O [`TODO.md`](../TODO.md) da raiz é o documento mais honesto do repositório, mas
foi escrito antes dos sete últimos commits: os itens 2 e 10 já foram resolvidos,
e ele não menciona a quebra de schema que está em andamento.

## As decisões, na ordem de dependência

> ✅ **Respondidas em 19/10/2026.** O modelo de estoque é um **ledger** de
> movimentos, com o saldo como cache reconstruível; a guarda é um **trigger do
> D1**; o conteúdo de um documento é **fixo na criação**; a reconciliação roda
> **uma vez por dia** e avisa sem bloquear. O contrato está em
> [`frozen/`](frozen/README.md).

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
   `tests/inventory.ts` reescrito como suíte do ledger, e `npm test` de volta
   ao gate do build.**
9. ~~**Documentação**~~ → **Feita**: `frozen/`, `arquitetura.md`, este
   documento, `AGENTS.md` e os dois documentos de frontend.
10. ~~**Banco local**~~ → **As migrations e o D1 local estão fora de sincronia**
    (`no such table: doador`). Depende da migration do ledger.

### Pendências

1. **Doação sem DRAFT** — consequência de "conteúdo fixo na criação": uma
   doação nasce quando a mercadoria chega. Se for preciso declarar uma doação
   futura, entra depois de forma aditiva.
2. **`POST /api/v1/inventory/rebuild` exposto como endpoint, ou só script?**
   Ele reescreve o saldo de todo item, e o modelo de papéis ainda não existe.
3. **O seed vai passar pela API.** Ele validava cada linha contra o
   `*SelectSchema`; com o contrato como fonte da verdade, o seed **posta** na
   API, e a validação passa a ser a do contrato. Isso é melhor, e é a decisão
   — mas é uma reescrita do `scripts/generate.ts` e do `scripts/seed.ts`.
4. **A tela do ledger pagina no servidor; o resto do app pagina no cliente.**
   Duas convenções convivendo.
5. **`staleTime: 5000` está comentado** em `src/react-app/lib/query-client.ts`.
   Com `staleTime: 0` e `refetchOnWindowFocus: true`, cada refocus refaz a
   consulta inteira. É o maior item isolado do orçamento de leitura, qualquer
   que seja o modelo.
6. **O `npm test` saiu do gate de build** (`package.json:82`), mas `AGENTS.md` e
   `docs/arquitetura.md` ainda diziam que ele estava lá.
7. **Caminhos de script errados**: `package.json:91` grava o auth em
   `./schemas/db/auth.ts` (falta `src/`); `scripts/update-openapi.sh:20` grava
   em `./src/openapi/schema.d.ts` (falta `schemas/`).
8. **`docs/inventory-pattern.md` foi para o arquivo** — ele era órfão e
   contradizia o código.
9. **Instância por instituição no plano Free são 10 bancos por conta** — cada
   instituição traz a sua conta ou é preciso o plano pago.
10. **`src/schemas/zod/` é deprecado** e ainda existe porque as rotas e o
    frontend o importam. Ele sai com a migração das rotas, e é a última coisa
    que ainda liga o banco ao contrato.

## Uma questão de governança

O [`AGENTS.md`](../AGENTS.md) autoriza levantar o congelamento do backend
**apenas** na branch `feat/redesenho-estoque`. Esta branch (`mess/but-in-a-good-way`)
saiu dela, mas é outra branch — e nela o backend foi reescrito por inteiro. No
papel, o backend está congelado aqui; na prática, não está. A autorização
precisa ser reescrita para esta branch, ou a `main` recebe uma branch que
quebra as próprias regras.

## O que o [`TODO.md`](../TODO.md) ainda descreve como pendente

Continua valendo: a tabela de linhas nos formulários de doação e entrega (itens 4
e 5), os casos de teste para o modelo novo (item 8) e o religamento da API nos
dois runners (item 9). E o item 1 continua valendo em espírito, mas por motivo
diferente: os `itemId` estão corretos agora, e o que quebra são as tabelas de
linha e o `reservedQuantity`, que saíram do schema.
