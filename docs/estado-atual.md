# Estado atual — branch `mess/but-in-a-good-way`

> **Atualizado em 20/10/2026, depois da implementação do ledger.** O modelo
> de estoque **virou ledger** e está implementado: o contrato em zod está
> escrito, o banco tem a tabela do ledger e o trigger da guarda, a API está
> sobre o contrato, e as duas suítes de teste passam. O que falta é o
> **frontend**, que é o outro lado do trabalho.
>
> O contrato continua em [`frozen/modelos-db.md`](frozen/modelos-db.md) e
> [`frozen/api.md`](frozen/api.md), e o raciocínio da troca, em
> [`arquitetura.md`](arquitetura.md#o-modelo-de-estoque-virou-ledger).

Fotografia do código depois da implementação do ledger, com o que está
pronto, o que está quebrado e o que ainda precisa ser decidido.

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
| `npm run lint` | **zero erro** |
| `tsc -b` (projeto `worker`) | **zero erro** |
| `tsc -b` (projeto `node`) | **zero erro** |
| `tsc -b` (projeto `app`) | **47 erros** — todos no frontend, pela migração para o contrato |
| `npm test` | **passa** — 38 casos de contrato |
| `npm run test:inventory` | **passa** — a suíte do ledger, contra o D1 local |
| `npm run build` | falha no `tsc -b`, no projeto `app` |

O `npm test` **voltou ao gate do build**: `package.json` agora é
`lint && tsc -b && npm test && vite build`.

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

## O frontend é o outro lado

O frontend ainda importa `src/schemas/zod/`, que saiu. São **47 erros de
tipo**, todos de arquivos que importam o schema antigo:

| Arquivo | O que falta |
|---|---|
| `components/forms/contacts/{beneficiary,donor}.tsx` | trocar `src/schemas/zod/contacts` por `@/schemas/api/*` |
| `components/forms/inventory/{item,category,donation,delivery}.tsx` | idem, e o contrato do formulário é o `*CreateSchema` / `*UpdateSchema` |
| `components/tables/**` | idem, e a linha da lista é mais estreita que o detalhe |
| `routes/_authenticated/**` | idem, e os caminhos das rotas da API |
| `lib/queries/**` | idem, e o envelope `{data}` e o `itemId` |

O que já está certo do lado do contrato, e que o frontend vai herdar: a
página da lista é mais estreita, o `itemId` é o nome da chave estrangeira, o
envelope é `{data}`, e o `openapi.json` é a fonte do tipo do cliente.

**A interface visível continua em inglês em alguns lugares**, e a tabela de
itens dos formulários de doação e entrega (itens 4, 5 e 7 do
[`TODO.md`](../TODO.md)) continua sendo o que o ledger mais simplifica: a
lista de itens **é** o conteúdo do documento.

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

1. **O frontend migrar para o contrato.** É o outro lado do trabalho, e é o
   que segura o `tsc -b`.
2. **A tela do ledger** — a única que pagina no servidor.
3. **As telas de saldo** (`GET /api/v1/stock`).
4. **Os botões de ação**: concluir entrega, cancelar entrega, estornar
   doação.
5. **A tabela de itens nos formulários** de doação e entrega.
6. **A interface em pt-BR** — sobrou "Donations", "New donation", "Back",
   "Identificacao", "Beneficiario", "Observacao" sem acento, e a
   inconsistência entre "Observação" e "Observacao".

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
   `tests/inventory.ts` reescrito como suíte do ledger, e `npm test` de volta
   ao gate do build.**
9. ~~**Documentação**~~ → **Feita**: `frozen/`, `arquitetura.md`, este
   documento, `AGENTS.md` e os dois documentos de frontend.
10. ~~**Banco local**~~ → **Sincronizado.** A migration do ledger está aplicada
    no D1 local, e o seed roda em cima dela.

### Pendências do banco

1. **O banco remoto ainda não recebeu a migration do ledger.** O
   `remote-db-init` continua sendo um passo manual, e o `wrangler.jsonc`
   continua apontando para o banco local.
2. **A migration do ledger muda `beneficiary` e `donor`** (o `telefone`, o
   `bairro`, a `cidade` e a `uf` viram `NOT NULL`), e o D1 **recusa**
   `DROP TABLE` de uma tabela que outra referencia. A migration renomeia a
   tabela antiga, cria a nova, copia e só então derruba a antiga — e é por
   isso que ela é mais comprida do que o `drizzle-kit` geraria sozinho.
