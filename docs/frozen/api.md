# API de domínio

CRUD de `assistidos` e `doadores`, mais o modelo de estoque inteiro — catálogo,
doações, entregas, contagem e ajuste. `coletas`, `entregas` e `itens` saíram: eram
o modelo que o redesenho de estoque substituiu, e a migration
`20261001222515_remarkable_wendell_rand` derruba as cinco tabelas.

## Estado da autenticação

Todas as rotas de domínio exigem uma sessão válida do Better Auth e ficam sob o
prefixo `/api/v1`. O prefixo existe para que a proteção de `/api/v1/*` nunca
alcance `/api/auth/*`, que precisa continuar público para login e cadastro.

O middleware fica em `src/worker/session-middleware.ts`
(`sessionMiddleware` + `requireSession`) e é aplicado uma única vez, em
`src/worker/index.ts`.

## ⚠️ Não está pronto para produção

O checklist de [`seguranca.md`](seguranca.md) define o que uma rota precisa
cumprir antes de ser considerada pronta. Hoje:

| Requisito do checklist | Estado |
|---|---|
| Exige autenticação | ✅ Cumprido |
| Valida que o usuário pertence à organização ativa | ❌ [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13) |
| Filtra os dados por `organization_id` | ❌ [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13) |
| Acesso por ID confere a organização do registro | ❌ [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13) |
| Permissão do papel verificada no backend | ❌ [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13) |
| Teste automatizado de acesso indevido (401/403 e cross-tenant) | ❌ [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13) |

O motivo é objetivo: as tabelas de domínio **não possuem a coluna
`organization_id`** (`src/worker/db/schema.ts`). Ela foi removida junto com a
integração do Better Auth e precisa voltar junto com o middleware multi-tenant
da issue #13. Até lá, estas rotas servem apenas o cenário de desenvolvimento com
uma única instituição, e **não devem ser expostas com dados reais** — os dados
de assistidos são sensíveis (ver `seguranca.md`, seção LGPD).

Não reintroduza um valor fixo de organização para "simular" o filtro: isso
contraria `seguranca.md` na regra 1, "nunca confiar em parâmetro do cliente para
identificar a instituição".

## Endpoints

| Método | Caminho | Resultado |
|---|---|---|
| `GET` | `/api/v1/{recurso}` | Lista todos os registros |
| `GET` | `/api/v1/{recurso}/:id` | Um registro, ou `404` |
| `POST` | `/api/v1/{recurso}` | Cria um registro e retorna `201` |
| `PATCH` | `/api/v1/{recurso}/:id` | Atualiza apenas os campos enviados |
| `DELETE` | `/api/v1/{recurso}/:id` | Exclui e retorna `204` |

## O modelo de estoque tem verbos próprios

Os cinco verbos acima não dão conta do estoque, porque nenhuma das sete operações
é um `PATCH`: cada uma mexe em dois contadores ao mesmo tempo, dentro de um
`db.batch()`, e o `PATCH` genérico não carrega isso. As rotas são em inglês, e só
a interface e as rotas do React ficam em português.

| Método | Caminho | O que faz |
|---|---|---|
| `POST` | `/api/v1/donations` | Cria a doação em `DRAFT` **com as linhas**, num batch só |
| `POST` | `/api/v1/donations/:id/receive` | Recebe: credita `on_hand` e vira `RECEIVED` |
| `POST` | `/api/v1/deliveries` | Cria a entrega em `OPEN` **com as linhas**, e reserva o estoque |
| `POST` | `/api/v1/deliveries/:id/complete` | Conclui: baixa `on_hand` e consome a reserva |
| `POST` | `/api/v1/deliveries/:id/cancel` | Cancela: libera a reserva |
| `POST` | `/api/v1/inventory-counts` | Grava a contagem, sobrescreve `on_hand` e registra um `STOCKTAKE` por item |
| `POST` | `/api/v1/inventory-adjustments` | Move `on_hand` em `±delta`, com o motivo registrado |

Os dois catálogos têm CRUD próprio: `/api/v1/item-categories` e
`/api/v1/inventory-items`. E `donation` e `delivery` têm `GET`, `GET/:id`,
`PATCH` e `DELETE` pela fábrica genérica, mas **não** `POST` — a criação é sempre
com as linhas.

### O corpo de uma operação com linhas

```json
{
  "donorId": "…",
  "occurredAt": "2026-01-02T03:04:05Z",
  "note": "opcional",
  "lines": [{ "inventoryItemId": "…", "quantity": 5 }]
}
```

`lines` é obrigatória e precisa de ao menos um item. O mesmo item não pode
aparecer duas vezes, porque a chave primária de `donation_line` e de
`delivery_line` é o par `(pai, item)`: `400 INVALID_VALUE` com a mensagem "An item
cannot appear twice in the same donation.".

### O que o cliente não escreve

| Campo | Por quê |
|---|---|
| `onHand`, `reservedQuantity`, `available` | Os dois contadores só se movem pelas sete operações. `available` é coluna gerada, e `handleApiError` não traduz a recusa de escrita nela. Enviar qualquer um dos três é `400 UNKNOWN_FIELD`. |
| `status` de `donation` e `delivery` | A transição é o que torna a operação idempotente, e ela é feita pelo servidor. |
| `countId` do ajuste | Só a contagem o preenche. |
| `reason` `STOCKTAKE` e `CORRECTION` | São gerados pela aplicação. O cliente manda `DONOR_RETURN`, `LOSS` ou `DAMAGE`. |
| `id` da linha | Quem define é o pai. |

### A reserva não é transação: é compensação

`db.batch()` é transação contra **erro**, não contra *statement que mudou zero
linhas*. A guarda da reserva não dá erro — ela apenas não casa. Então
`POST /deliveries` é **escreve, confere, compensa**:

1. Um batch grava a entrega, as linhas, e roda as reservas guardadas.
2. `results[i].meta.changes === 0` marca o item sem estoque.
3. Se houver algum, um segundo batch **libera** as reservas que passaram e apaga
   as linhas e a entrega.
4. A resposta é `409 INSUFFICIENT_STOCK`, dizendo **quantos** itens faltaram.

O passo 3 é o que fecha o desenho: apagar linha é idempotente, mas o contador
que subiu no passo 1 **também precisa descer** — e ele só desce pela reserva que
passou. Sem isso o `reserved_quantity` ficaria maior do que a soma das reservas
abertas.

`POST /inventory-adjustments` usa a mesma assimetria: grava o ajuste, e se a
guarda `on_hand + delta >= 0` não casar, apaga o ajuste e responde `409 CONFLICT`.

Já `POST /inventory-counts` faz o inverso: **lê** o estoque antes de escrever, e
recusa a contagem que vier abaixo de `reserved_quantity` **sem escrever nada**.

### Concluir e cancelar dependem de uma leitura antes

`POST /deliveries/:id/complete` e `POST /deliveries/:id/cancel` leem o
`reserved_quantity` das linhas antes do batch, e devolvem `409 CONFLICT` se alguma
linha não tiver reserva correspondente — antes de qualquer escrita. Isso é
defesa contra drift, não o caminho normal: pela invariante, a reserva existe
sempre. O guard dentro do SQL continua lá.

### O endpoint de ajuste não tem permissão

`POST /inventory-adjustments` fica **sem verificação de papel** neste ciclo. É
limitação conhecida e não oversight: o desenho de papéis é `user` e `supervisor`,
e ele não é implementável antes da
[#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13). Ver
[`../future/README.md`](../future/README.md).

Respostas com dados usam o envelope:

```json
{ "data": {} }
```

Erros usam o formato:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Assistido not found."
  }
}
```

Códigos: `400` para dados inválidos, `401` sem sessão, `404` para recurso
inexistente, `409` para conflito com registros relacionados, `415` quando o
corpo não é enviado como `application/json` e `500` para erro inesperado. O `401`
é a única resposta sem corpo: o `requireSession` lança um `HTTPException` cru, e
o status basta.

Lista fechada dos códigos que o cliente pode receber:

| Código | Status | Quando |
|---|---|---|
| `REQUIRED_FIELD` | 400 | Coluna `NOT NULL` ausente ou `null` |
| `UNKNOWN_FIELD` | 400 | Campo que não existe na tabela |
| `READ_ONLY_FIELD` | 400 | Tentou enviar `id` no corpo |
| `EMPTY_UPDATE` | 400 | `PATCH` sem nenhum campo |
| `INVALID_VALUE` | 400 | Valor fora do domínio (enum, formato, `>= 0`, regra de domínio) |
| `INVALID_REFERENCE` | 400 | FK apontando para registro inexistente |
| `INVALID_TRANSITION` | 400 | Operação de estoque em registro que não está no estado de origem |
| `INSUFFICIENT_STOCK` | 409 | Reserva ou contagem acima do disponível, com a quantidade na mensagem |
| `INVALID_JSON` | 400 | Corpo não é JSON parseável |
| `INVALID_BODY` | 400 | Corpo é JSON, mas não é um objeto |
| `NOT_FOUND` | 404 | Registro ou rota inexistente |
| `CONFLICT` | 409 | Unique violado, ou `DELETE` com registro relacionado |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | `content-type` diferente de `application/json` |
| `INTERNAL_ERROR` | 500 | Qualquer outra falha, inclusive `CHECK constraint failed` |

`POST` responde `201` com um header `Location` apontando para o recurso criado.

Uma requisição devolve **no máximo um** erro: o validador para no primeiro
problema encontrado, então um corpo com três campos inválidos não vem com três
erros.

O **código** é o contrato: é nele que o cliente deve ramificar, e é ele que a
coleção do Insomnia verifica. A `message` é uma frase em inglês, escrita para
quem está olhando a resposta, e vem em três formas — a genérica
(`Field 'renda' has an invalid value.`) para valor inválido, a específica
quando a regra diz mais do que isso (`Field 'uf' must be one of: …`), e a que
**não traz o nome do campo**, reservada para as regras de domínio que envolvem
dois campos ao mesmo tempo.

> **Exceção ao idioma:** o handler de rota não encontrada devolve
> `"Rota não encontrada."`, em português (`src/worker/index.ts`). Vale corrigir
> para manter a regra acima — está anotado em [`../AGENTS.md`](../../AGENTS.md).

## Regras de domínio

- `id` é gerado pelo servidor (UUID) e não pode ser enviado pelo cliente.
- Campos desconhecidos são rejeitados com `400 UNKNOWN_FIELD`.
- Colunas `NOT NULL` sem valor são rejeitadas com `400 REQUIRED_FIELD` — `null`
  conta como ausente, e não como valor inválido.
- Um `PATCH` sem nenhum campo é `400 EMPTY_UPDATE`.
- O corpo é validado por um schema zod gerado da própria tabela com
  `drizzle-orm/zod`, e convertido no mesmo passo: `renda` chega ao Drizzle como
  número, `cestaBasica` como booleano e `dataHora` (ISO 8601) como `Date`.
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
- Uma doação nasce em `DRAFT` e uma entrega em `OPEN`. Quem muda o estado é o
  verbo — `receive`, `complete`, `cancel` — e nunca o `PATCH`.
- Uma doação só é recebida de `DRAFT`, uma entrega só é concluída ou cancelada
  enquanto `OPEN`. Fora disso, `400 INVALID_TRANSITION`.
- `quantity` é maior que zero, e o mesmo item não pode repetir no mesmo pai.
- Quem doou e quem recebeu saem da doação e da entrega, nunca de uma coluna do
  item: o item de estoque é a linha, e as duas pontas ficam nos eventos.
- Exclusões bloqueadas por relacionamentos retornam `409` em vez de expor o erro
  interno do banco. Na prática, **doação e entrega com linhas não podem ser
  excluídas**: reverter o movimento do estoque não é uma das sete operações, e o
  `FOREIGN KEY` das linhas recusa o `DELETE`.

### Onde cada regra mora

Duas camadas, e o critério é o mesmo da [#43](https://github.com/luiztosk/sistema-doacoes-2/issues/43):
a forma do valor é do zod, e o que precisa da linha anterior é do handler.
Existência de referência é do banco — o `FOREIGN KEY` do D1 recusa a escrita, e o
erro capturado vira código aqui.

| Regra | Onde |
|---|---|
| tipo, `NOT NULL`, `enum`, conversão | `src/worker/db/schema.ts` (`<tabela>InsertSchema` / `UpdateSchema` / `SelectSchema`, gerados por `drizzle-orm/zod`) |
| `nome` não vazio, `email` com formato, `cep` com 8 dígitos, `renda`/`valorAluguel`/contadores `>= 0` | `refinement` no mesmo arquivo, logo abaixo da tabela que ele julga |
| `INVALID_STATUS_TRANSITION`, `DELIVERY_REQUIRED` | `validateItem` em `src/worker/api/v1.ts` (dependem da linha anterior, que nenhum schema de payload enxerga) |
| `INVALID_REFERENCE` | `FOREIGN KEY` do D1, mapeado em `handleApiError` (`src/worker/api/errors.ts`) |
| envelope `{ error: { code, message } }` a partir dos issues do zod | `errorFromIssue` em `src/worker/api/errors.ts` |

### `.refine()` vaza português para a resposta da API

As mensagens dos refinements em `schema.ts` estão em português porque servem à
mensagem de campo do formulário. A API responde em inglês. As duas coisas só
convivem porque `errorFromIssue` **ignora `issue.message` em quase todo caso**:
ele reconstrói a frase em inglês a partir de `issue.code`, e a mensagem do zod só
passa adiante no ramo `"custom"` — que é exatamente o que `.refine()` produz.

Então: **nenhum schema que a API valide pode usar `.refine()`**, ou a resposta sai
em português. Regra que atravessa dois campos do mesmo objeto — o mesmo item duas
vezes em `lines`, por exemplo — vai no handler, com `apiError(...)` e frase em
inglês. Isso vale mesmo quando a regra parece caber no zod.

### O `check()` foi removido, e isso é visível no contrato

O schema **teve** 26 `check()` ([#43](https://github.com/luiztosk/sistema-doacoes-2/issues/43))
e não tem mais: a regra de valor existe em um lugar só, o zod. O motivo e o preço
estão em [`modelos-db.md`](modelos-db.md). Para o
cliente, a mudança é boa — nada de `409 CONFLICT` genérico por valor inválido,
sempre `400 INVALID_VALUE` com o campo nomeado — com uma brecha, conhecida e
registrada:

`tipoImovel` × `valorAluguel` deixou de ser regra. `POST {"tipoImovel":"PROPRIO",
"valorAluguel":1}` volta `201`, e o mesmo vale no `PATCH`. Era o único `.refine()`
que o zod não conseguia expressar como qualificador nativo, por ser entre duas
colunas; a [#44](https://github.com/luiztosk/sistema-doacoes-2/issues/44) exigiu
que o gerador de seed lesse estes schemas, e um `refine()` é opaco para qualquer
ferramenta. Se a regra voltar, o lugar dela é um `validate` no
`registerResource` de `assistido` em [`resource.ts`](../../src/worker/api/resource.ts)
— que tem o que o zod não tem, a linha anterior.

## Valores recusados pelo banco

Duas coisas, e só duas:

- **Referência que não existe.** `donation.donor_id`, `delivery.beneficiary_id`,
  `inventory_item.category_id` e os `inventory_item_id` das linhas e dos ajustes
  são `FOREIGN KEY`, e o D1 recusa a escrita. `handleApiError` traduz o erro: em
  `POST`/`PATCH` é `400 INVALID_REFERENCE` (o cliente inventou o id), e em
  `DELETE` é `409 CONFLICT` (o registro tem linhas dependentes). A mensagem é a
  mesma para todas as chaves, porque o texto do D1 não diz qual delas falhou.
- **Nome repetido no catálogo.** `item_category_name_uniq` e
  `inventory_item_name_uniq` são `CREATE UNIQUE INDEX` sobre `lower(name)`, então
  "arroz 5kg" e "Arroz 5kg" colidem. Sai como `409 CONFLICT`, que é o status
  certo — duas linhas do mesmo registro, não um valor inválido.
- **Item repetido na mesma donation.** A PK composta de `donation_line` e
  `delivery_line` recusa, e o texto do D1 começa com `UNIQUE constraint failed`,
  então o `409` sai sozinho. A API antecipa com `400 INVALID_VALUE`, porque a
  mensagem genérica de conflito não diz o que fazer.

Fora dessas, o D1 não recusa nada: não há `check()`. A
[tabela acima](#regras-de-domínio) é a lista do que a API recusa, e vale apenas
para o que passa por ela — D1 Studio, `npm run db-seed` e scripts futuros
escrevem sem nenhum desses filtros. Ver
[`modelos-db.md`](modelos-db.md).

### DELETE em doação e entrega

Não há verbo para desfazer uma doação recebida ou uma entrega concluída, porque
reverter o estoque não é uma das sete operações — o caminho registrado é um
ajuste, que deixa rastro em `inventory_adjustment`. Por isso `DELETE` em
`donation` e `delivery` só funciona em registro **sem linhas**, e o resto é
`409 CONFLICT` pelo `FOREIGN KEY`. Um `DRAFT` com linhas também não sai: apagar
as linhas na mão continua sendo possível pelo D1 Studio, e é a única saída hoje.

## Testes com Insomnia

A coleção versionada em `insomnia/` cobre o fluxo de listar, criar, consultar,
atualizar e excluir de cada recurso, além dos casos negativos. Cada request
envia o cookie `better-auth.session_token` e tem assertions no `afterResponse`.

1. Inicialize e popule o D1 local: `npm run local-db-init`.
2. Rode `npm run dev`.
3. Importe o Environment e a Collection do YAML em `insomnia/`.
4. Execute a coleção na ordem apresentada pelo Collection Runner.

A coleção usa `{{ _.BASE_URL }}` e salva os IDs criados em variáveis como
`{{ _.ASSISTIDO_CREATED_ID }}`, então os requests dependem da execução anterior.
