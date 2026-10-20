# API de domínio

CRUD de `beneficiaries` e `donors`, mais o modelo de estoque inteiro — catálogo,
doações, entregas, contagem e ajuste. `coletas`, `entregas` e `itens` saíram: eram
o modelo que o redesenho de estoque substituiu.

> **O modelo de estoque virou ledger.** As sete operações de contadores
> (`on_hand` / `reserved_quantity`, tabelas de linha) foram substituídas por
> movimentos num ledger, decidido em 19/10/2026 e **em implementação** na branch
> `mess/but-in-a-good-way`. O desenho anterior está em
> [`../future/README.md`](../future/README.md), como leitura histórica; o porquê
> da troca, em [`../arquitetura.md`](../arquitetura.md#o-modelo-de-estoque-virou-ledger).
>
> O que muda para o cliente: `POST /donations/:id/receive` **sai** (a entrega do
> estoque é a própria criação), `DELETE` em doação e entrega **sai** (o caminho
> é estornar), e `GET /api/v1/ledger` **entra**.

## Onde o contrato está escrito

O contrato vive em **zod, à mão**, em [`../../src/schemas/api/`](../../src/schemas/api/) —
um arquivo por recurso. Este documento é a **explicação** do contrato; o
schema é o **contrato**.

| Schema | É o quê |
|---|---|
| `<recurso>Schema` | a resposta do **detalhe** |
| `<recurso>ListSchema` | a linha da **lista** — mais estreita, e a validação reprova a lista se ela vier com campo a mais |
| `<recurso>CreateSchema` | o corpo do `POST` |
| `<recurso>UpdateSchema` | o corpo do `PATCH` |
| `<recurso>ListQuerySchema` | os query params |

O `openapi.json` é **gerado** desse zod, e é o formato publicado. Ver
[`../arquitetura.md`](../arquitetura.md#o-contrato-da-api-vem-primeiro).

**Duas regras que o zod do contrato impõe:**

1. **Nenhum schema de contrato usa `.refine()`.** A resposta da API tem que
   estar em inglês, e ela só está porque o `errorFromIssue` reconstrói a
   frase a partir do `issue.code` e ignora o `issue.message` — **menos** no
   ramo `"custom"`, que é o que `.refine()` produz. Regra que atravessa dois
   campos vai no handler, com `apiError(...)` e frase em inglês.
2. **Os schemas de resposta são `.strict()`.** Um schema de resposta que
   *rejeita* campo a mais é o que pega a lista carregando o endereço de todo
   mundo. Sem `.strict()`, o zod descarta o campo e o bug passa.

O `src/schemas/db/` guarda o Drizzle, e **não** gera zod: o `drizzle-orm/zod`
saiu, e o `src/schemas/zod/` saiu com a migração das rotas, em 20/10/2026. O
que valida a API é o zod do contrato, em `src/schemas/api/`.

## Estado da autenticação

Todas as rotas de domínio exigem uma sessão válida do Better Auth e ficam sob o
prefixo `/api/v1`. O prefixo existe para que a proteção de `/api/v1/*` nunca
alcance `/api/auth/*`, que precisa continuar público para login e cadastro.

O middleware fica em `src/worker/session-middleware.ts`
(`sessionMiddleware` + `requireSession`) e é aplicado uma única vez, em
`src/worker/index.ts`.

## A instituição é a instância

**Não há multi-tenancy.** Uma instância do sistema serve **uma** instituição, e
outra instituição é outra instância, com o seu próprio banco. Não existe
`organization_id` em nenhuma tabela de domínio, e nenhuma query filtra por
instituição.

Consequência prática: as regras de isolamento por tenant que
[`seguranca.md`](seguranca.md) descrevia caem por construção — não há o que
filtrar. O que resta é autenticação, autorização e LGPD.

Uma consequência operacional: o plano Free do D1 permite **10 bancos por
conta**, e uma instância por instituição significa um banco por instituição.
Cada instituição traz a sua conta, ou é preciso o plano pago.

## Endpoints

| Método | Caminho | Resultado |
|---|---|---|
| `GET` | `/api/v1/{recurso}` | Lista todos os registros |
| `GET` | `/api/v1/{recurso}/:id` | Um registro, ou `404` |
| `POST` | `/api/v1/{recurso}` | Cria um registro e retorna `201` |
| `PATCH` | `/api/v1/{recurso}/:id` | Atualiza apenas os campos enviados |
| `DELETE` | `/api/v1/{recurso}/:id` | Exclui e retorna `204` |

Recursos com CRUD próprio: `/api/v1/beneficiaries`, `/api/v1/donors`,
`/api/v1/inventory/categories` e `/api/v1/inventory/items`.

`inventory_count` e `inventory_adjustment` **não** têm `PATCH` nem `DELETE`:
o conteúdo de um documento é fixo, e a correção é movimento novo. A contagem
grava, além do `COUNT`, um `inventory_adjustment` de motivo `STOCKTAKE` por
item — é o registro da diferença, e é ele que dá sentido à coluna `count_id`.

## O modelo de estoque tem verbos próprios

Os cinco verbos acima não dão conta do estoque, porque nenhuma das operações
é um `PATCH`: cada uma mexe no ledger **e** no saldo ao mesmo tempo, dentro de
um `db.batch()`, e o `PATCH` genérico não carrega isso. As rotas são em inglês,
e só a interface e as rotas do React ficam em português.

| Método | Caminho | O que faz |
|---|---|---|
| `POST` | `/api/v1/donations` | Cria a doação **e** registra o `RECEIVE`, num lote só |
| `POST` | `/api/v1/donations/:id/void` | Estorna: grava o `REVERSE` e vira `VOID` |
| `POST` | `/api/v1/deliveries` | Cria a entrega **e** registra o `RESERVE`, num lote só |
| `POST` | `/api/v1/deliveries/:id/complete` | Conclui: registra o `ISSUE` |
| `POST` | `/api/v1/deliveries/:id/cancel` | Cancela: registra o `RELEASE` |
| `POST` | `/api/v1/inventory-counts` | Grava a contagem, o `COUNT` por item e o `STOCKTAKE` que registra a diferença |
| `POST` | `/api/v1/inventory-adjustments` | Grava o `ADJUST`, com o motivo registrado |
| `GET` | `/api/v1/stock` | O saldo: item, em estoque, reservado, disponível |
| `GET` | `/api/v1/ledger` | O histórico de movimentos, paginado no servidor |

`donation` e `delivery` têm `GET`, `GET/:id` e `PATCH` — mas **não** `POST` nem
`DELETE` pela fábrica genérica: a criação é sempre com os itens, e a remoção de
um documento com movimentações é estorno, não `DELETE`.

### `GET` de detalhe devolve os movimentos; a lista não

`GET /donations/:id` e `GET /deliveries/:id` devolvem o registro **com os
movimentos embutidos**, no mesmo formato que o `POST` aceita:

```json
{
  "data": {
    "id": "…",
    "beneficiaryId": "…",
    "occurredAt": "2026-05-19T10:32:35.000Z",
    "status": "OPEN",
    "note": null,
    "items": [{ "itemId": "…", "quantity": 4 }]
  }
}
```

A linha leva `itemId` e não o nome do item, porque o cliente já tem o catálogo
de `inventory/items` em cache e faz a junção — a mesma decisão que vale para o
filtro das tabelas.

**A lista é mais estreita que o detalhe, e isso é contrato.**
`GET /beneficiaries` devolve 9 campos — `id`, `name`, `phone`, `email`,
`cidade`, `uf`, `renda`, `tipoImovel`, `cestaBasica` — e **não** devolve o
endereço. A validação da resposta reprova a lista se ela vier com
`logradouro` a mais. Antes do contrato virar a fonte da verdade, a lista
devolvia as 26 colunas, endereço incluído.

Os movimentos vêm do ledger, filtrando por `ref_id`:

```sql
SELECT item_id, reserved_delta AS quantity
  FROM ledger WHERE ref_id = ? AND kind = 'RESERVE';
```

O `kind` importa: uma entrega concluída tem `RESERVE` **e** `ISSUE`, e uma
cancelada tem `RESERVE` **e** `RELEASE`. O que descreve o **conteúdo** da
entrega é sempre o `RESERVE`; os outros são o acerto.

`GET /donations` e `GET /deliveries` **não** trazem linhas: são listas, e a lista
de uma entrega é uma linha na tabela, não um documento.

### O corpo de uma operação com itens

```json
{
  "donorId": "…",
  "occurredAt": "2026-01-02T03:04:05Z",
  "note": "opcional",
  "items": [{ "itemId": "…", "quantity": 5 }]
}
```

`items` é obrigatória e precisa de ao menos um item. O mesmo item não pode
aparecer duas vezes, porque a chave do ledger é o par `(kind, ref_id, item_id)`:
`400 INVALID_VALUE` com a mensagem "An item cannot appear twice in the same
donation.".

### O conteúdo do documento é fixo na criação

Os itens de uma doação ou de uma entrega **não mudam** depois que o documento
existe. O `PATCH` mexe só no cabeçalho — `donorId`, `beneficiaryId`,
`occurredAt`, `note`. Para corrigir o conteúdo, o caminho é **estornar e
recriar**: `POST /donations/:id/void` ou `POST /deliveries/:id/cancel`, e um
documento novo.

A razão é que o ledger é **append-only**: um `RESERVE` escrito não se
desfaz, só se compensa. Permitir editar o conteúdo de uma entrega aberta
exigiria um `RELEASE` parcial por item, o que é mais mecanismo do que o caso de
uso pede.

### O que o cliente não escreve

| Campo | Por quê |
|---|---|
| `onHand`, `reserved`, `available` | O saldo só se move pelas operações. `available` é coluna gerada, e o D1 recusa escrita nela. Enviar qualquer um dos três é `400 UNKNOWN_FIELD`. |
| `status` de `donation` e `delivery` | A transição é o que torna a operação idempotente, e ela é feita pelo servidor. |
| `seq` do ledger | É do banco. |
| `reason` `STOCKTAKE` e `CORRECTION` | São gerados pela aplicação. O cliente manda `DONOR_RETURN`, `LOSS` ou `DAMAGE`. |

## A guarda vive no banco

A regra que impede overcommit **não é código da aplicação**: é um trigger do D1
que aborta a escrita da entrada no ledger. O `RAISE(ABORT, ...)` chega ao Worker
como `SQLITE_CONSTRAINT_TRIGGER`, com a mensagem intacta, e reverte o lote
inteiro.

O trigger e as quatro regras estão em
[`modelos-db.md`](modelos-db.md#a-guarda-é-um-trigger-do-d1). O que importa para
o cliente é o **efeito**: uma operação que estouraria o estoque **não escreve
nada** e responde `409` com o código do trigger.

| `kind` | Condição recusada | Código |
|---|---|---|
| `RESERVE` | `on_hand - reserved < q` | `409 INSUFFICIENT_STOCK` |
| `ISSUE` | `on_hand < q` | `409 INSUFFICIENT_STOCK` |
| `RELEASE` | `reserved < q` | `409 INVALID_RELEASE` |
| `ADJUST`, `COUNT` | `on_hand + delta < reserved + reserved_delta` | `409 NEGATIVE_STOCK` |
| `REVERSE` | `on_hand + delta < reserved + reserved_delta` | `409 NEGATIVE_STOCK` |

O `REVERSE` é o estorno, e o estorno **devolve** estoque. Uma doação já
entregue não pode ser estornada: o `ISSUE` da entrega já consumiu parte do
que o `RECEIVE` tinha trazido, e devolver o valor inteiro levaria o saldo
abaixo de zero. O estorno de uma doação que ainda está inteira devolve o
físico e deixa a `donation` em `VOID`.

### Cada operação é dois statements, e a ordem importa

Toda operação de estoque é o mesmo par dentro de um `db.batch()`:

```sql
-- 1. a entrada no ledger (o trigger é a guarda)
INSERT INTO ledger (id, item_id, kind, on_hand_delta, reserved_delta, ref_id, occurred_at)
VALUES (:id, :item_id, 'RESERVE', 0, :q, :ref_id, :now);

-- 2. o cache, guardado pela existência da entrada
UPDATE inventory_item SET reserved = reserved + :q
 WHERE id = :item_id AND EXISTS (SELECT 1 FROM ledger WHERE id = :id);
```

O guard fica **só** no statement 1, que lê o saldo **antes** da mutação. Se ele
falhar, o statement 1 não escreve e o statement 2 não acha a entrada — nada é
escrito, e a resposta é `409`.

A ordem dentro do lote é load-bearing: **a guarda vem primeiro, o cache depois**.
A variante ingênua, com o mesmo guard nos dois statements, perde a entrada do
ledger — o segundo statement lê o saldo já mutado, não casa, e o lote termina
com o cache movido e o ledger sem a linha.

## Envelope e erros

Respostas com dados usam o envelope:

```json
{ "data": {} }
```

Erros usam o formato:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Beneficiary not found."
  }
}
```

`400` para dados inválidos, `401` sem sessão, `404` para recurso inexistente,
`409` para conflito com registros relacionados, `415` quando o corpo não é
enviado como `application/json` e `500` para erro inesperado. O `401` é a única
resposta sem corpo: o `requireSession` lança um `HTTPException` cru, e o status
basta.

Lista fechada dos códigos que o cliente pode receber:

| Código | Status | Quando |
|---|---|---|
| `REQUIRED_FIELD` | 400 | Coluna `NOT NULL` ausente ou `null` |
| `UNKNOWN_FIELD` | 400 | Campo que não existe na tabela |
| `READ_ONLY_FIELD` | 400 | Tentou enviar `id` no corpo |
| `EMPTY_UPDATE` | 400 | `PATCH` sem nenhum campo |
| `INVALID_VALUE` | 400 | Valor fora do domínio (enum, formato, `>= 0`, regra de domínio) |
| `INVALID_REFERENCE` | 400 | FK apontando para registro inexistente |
| `INVALID_TRANSITION` | 400 | Operação de estoque em documento que não está no estado de origem |
| `INVALID_JSON` | 400 | Corpo não é JSON parseável |
| `INVALID_BODY` | 400 | Corpo é JSON, mas não é um objeto |
| `NOT_FOUND` | 404 | Registro ou rota inexistente |
| `INSUFFICIENT_STOCK` | 409 | Reserva ou emissão acima do disponível |
| `NEGATIVE_STOCK` | 409 | Ajuste ou contagem abaixo do reservado |
| `INVALID_RELEASE` | 409 | Cancelamento acima do reservado |
| `CONFLICT` | 409 | Unique violado, ou `DELETE` com registro relacionado |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | `content-type` diferente de `application/json` |
| `INTERNAL_ERROR` | 500 | Qualquer outra falha |

`POST` responde `201` com um header `Location` apontando para o recurso criado.

Uma requisição devolve **no máximo um** erro: o validador para no primeiro
problema encontrado, então um corpo com três campos inválidos não vem com três
erros.

O **código** é o contrato: é nele que o cliente deve ramificar, e é ele que a
coleção do Insomnia verifica. A `message` é uma frase em inglês, escrita para
quem está olhando a resposta, e vem em três formas — a genérica
(`Field 'name' has an invalid value.`) para valor inválido, a específica
quando a regra diz mais do que isso (`Field 'uf' must be one of: …`), e a que
**não traz o nome do campo**, reservada para as regras de domínio que envolvem
dois campos ao mesmo tempo.

## Regras de domínio

- `id` é gerado pelo servidor (UUID) e não pode ser enviado pelo cliente.
- Campos desconhecidos são rejeitados com `400 UNKNOWN_FIELD`.
- Colunas `NOT NULL` sem valor são rejeitadas com `400 REQUIRED_FIELD` — `null`
  conta como ausente, e não como valor inválido.
- Um `PATCH` sem nenhum campo é `400 EMPTY_UPDATE`.
- O corpo é validado por um schema zod gerado da própria tabela com
  `drizzle-orm/zod`, e convertido no mesmo passo: `renda` chega ao Drizzle como
  número, `cestaBasica` como booleano e `occurredAt` (ISO 8601) como `Date`.
  Valor com tipo errado, fora de um `enum` ou fora de um piso sai como
  `400 INVALID_VALUE`, com o nome do campo na mensagem.
- `uf` é `z.enum` das 27 UFs, não é normalizado: `uf: "sp"` é
  `400 INVALID_VALUE`. A sigla é a que o banco guarda.
- `cep` é `z.string().regex(/^\d{8}$/)`: oito dígitos, e nada além deles.
  `01310-100` é recusado — o traço do ViaCEP (#16) sai na entrada, e a
  normalização é do cliente, não da API.
- `email`, quando presente, precisa ter formato de e-mail. O campo é opcional e
  anulável, mas o que vem dentro é julgado.
- Referências a doador, assistido, categoria e item de estoque precisam existir:
  é o `FOREIGN KEY` do D1 que recusa a escrita, e o erro vira
  `400 INVALID_REFERENCE`.
- Uma entrega só é concluída ou cancelada enquanto `OPEN`. Fora disso,
  `400 INVALID_TRANSITION`.
- Uma doação só é estornada enquanto `RECEIVED`. Fora disso,
  `400 INVALID_TRANSITION`.
- `quantity` é maior que zero, e o mesmo item não pode repetir no mesmo documento.
- Quem doou e quem recebeu saem da doação e da entrega, nunca de uma coluna do
  item: o item de estoque é o movimento, e as duas pontas ficam nos documentos.
- Exclusões bloqueadas por relacionamentos retornam `409` em vez de expor o erro
  interno do banco. Na prática, **item com movimentação não pode ser excluído**:
  o `FOREIGN KEY` do ledger recusa o `DELETE`.

### A reconciliação é a segunda camada de segurança

O saldo em `inventory_item` é **cache**, e o ledger é a verdade. Uma
reconciliação diária confere os dois, e uma segunda invariante prova que o
estoque **nunca** overcommitou, em nenhum momento da história. As duas
consultas estão em
[`modelos-db.md`](modelos-db.md#as-duas-invariantes).

Quando a reconciliação acha divergência, ela **avisa e segue**: a instituição
não para de entregar por causa de bookkeeping. O reparo é reconstruir o cache a
partir do ledger, que é seguro porque o cache é derivado.

## Onde cada regra mora

Duas camadas, e o critério é o mesmo da [#43](https://github.com/luiztosk/sistema-doacoes-2/issues/43):
a forma do valor é do zod, e o que precisa da linha anterior é do handler.
Existência de referência é do banco — o `FOREIGN KEY` do D1 recusa a escrita, e o
erro capturado vira código aqui.

| Regra | Onde |
|---|---|
| tipo, `NOT NULL`, `enum`, conversão | `src/schemas/api/` (`<recurso>CreateSchema` / `UpdateSchema` / `Schema`, escritos à mão) |
| `nome` não vazio, `email` com formato, `cep` com 8 dígitos, `renda`/`valorAluguel` `>= 0` | no mesmo schema, com a mensagem em português, que serve ao formulário |
| `INVALID_TRANSITION` | o handler do verbo, que conhece o estado anterior, que nenhum schema de payload enxerga |
| `INVALID_REFERENCE` | `FOREIGN KEY` do D1, mapeado em `handleApiError` (`src/worker/api/errors.ts`) |
| `INSUFFICIENT_STOCK`, `NEGATIVE_STOCK`, `INVALID_RELEASE` | o trigger `ledger_guard` do D1, mapeado no mesmo `handleApiError` |
| envelope `{ error: { code, message } }` a partir dos issues do zod | `errorFromIssue` em `src/worker/api/errors.ts` |

### `SQLITE_CONSTRAINT_TRIGGER` precisa de tradução

O trigger aborta com `RAISE(ABORT, 'INSUFFICIENT_STOCK')`, e o D1 devolve
`SQLITE_CONSTRAINT_TRIGGER` com a mensagem intacta. **Sem um ramo para esse
código na camada de erro, a guarda vira `500 INTERNAL_ERROR`** — e o cliente
perde a informação de que o motivo foi estoque.

É a mesma classe do `CHECK constraint failed` que o
[`seguranca.md`](seguranca.md) já manda não criar. A diferença é que o trigger
carrega uma mensagem utilizável, e o `handleApiError` precisa saber lê-la.

### `.refine()` vaza português para a resposta da API

As mensagens dos schemas em `src/schemas/api/` estão em português porque
servem à mensagem de campo do formulário. A API responde em inglês. As duas
coisas só convivem porque `errorFromIssue` **ignora `issue.message` em quase
todo caso**: ele reconstrói a frase em inglês a partir de `issue.code`, e a
mensagem do zod só passa adiante no ramo `"custom"` — que é exatamente o que
`.refine()` produz.

Então: **nenhum schema que a API valide pode usar `.refine()`**, ou a resposta
sai em português. Regra que atravessa dois campos do mesmo objeto — o mesmo item
duas vezes em `items`, por exemplo — vai no handler, com `apiError(...)` e frase
em inglês.

## Valores recusados pelo banco

Três coisas:

- **Referência que não existe.** `donation.donor_id`,
  `delivery.beneficiary_id`, `inventory_item.category_id` e `ledger.item_id` são
  `FOREIGN KEY`, e o D1 recusa a escrita. `handleApiError` traduz o erro: em
  `POST`/`PATCH` é `400 INVALID_REFERENCE` (o cliente inventou o id), e em
  `DELETE` é `409 CONFLICT` (o registro tem movimentos dependentes). A mensagem
  é a mesma para todas as chaves, porque o texto do D1 não diz qual delas
  falhou.
- **Nome repetido no catálogo.** `item_category_name_uniq` e
  `inventory_item_name_uniq` são `CREATE UNIQUE INDEX` sobre `lower(name)`, então
  "arroz 5kg" e "Arroz 5kg" colidem. Sai como `409 CONFLICT`.
- **Movimento repetido.** O `UNIQUE(kind, ref_id, item_id)` do ledger recusa o
  segundo movimento do mesmo item no mesmo documento, e o `UNIQUE(id)` recusa a
  repetição da operação inteira. A API antecipa o primeiro com
  `400 INVALID_VALUE`; o segundo é o que torna o `POST` idempotente.

Fora dessas, o D1 não recusa nada. A
[tabela acima](#regras-de-domínio) é a lista do que a API recusa, e vale apenas
para o que passa por ela — D1 Studio, `npm run db-seed` e scripts futuros
escrevem sem nenhum desses filtros.

### `DELETE` em item com movimentação

Um item que já aparece no ledger **não pode ser apagado**: o `FOREIGN KEY` recusa
e a resposta é `409 CONFLICT`. O caminho é reclassificar o item, não apagar.

## Testes com Insomnia

A coleção versionada em `insomnia/` cobre o fluxo de listar, criar, consultar,
atualizar e excluir de cada recurso, além dos casos negativos. Cada request
envia o cookie `better-auth.session_token` e tem assertions no `afterResponse`.

1. Inicialize e popule o D1 local: `npm run local-db-init`.
2. Rode `npm run dev`.
3. Importe o Environment e a Collection do YAML em `insomnia/`.
4. Execute a coleção na ordem apresentada pelo Collection Runner.

A coleção usa `{{ _.BASE_URL }}` e salva os IDs criados em variáveis como
`{{ _.BENEFICIARY_CREATED_ID }}`, então os requests dependem da execução anterior.
