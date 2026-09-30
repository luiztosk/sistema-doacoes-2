# API de domínio

Endpoints CRUD dos recursos `assistidos`, `doadores`, `coletas`, `entregas` e
`itens`. Esta é a entrega da issue #14, com a validação de payload da #42.

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
| `INVALID_STATUS_TRANSITION` | 400 | Salto de status não permitido no `item` |
| `DELIVERY_REQUIRED` | 400 | `item` indo para `ENTREGUE` sem `entregaId` |
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
- Referências a doador, assistido, coleta, entrega e nome de item precisam
  existir: é o `FOREIGN KEY` do D1 que recusa a escrita, e o erro vira
  `400 INVALID_REFERENCE`.
- Um item novo começa em `AGUARDA_COLETA`.
- A única sequência permitida é `AGUARDA_COLETA → EM_ESTOQUE → ENTREGUE`.
- Um item marcado como `ENTREGUE` precisa de `entregaId`.
- Quem doou e quem recebeu saem da coleta e da entrega, não de colunas do item —
  ver [`modelos-db.md`](modelos-db.md#item).
- Exclusões bloqueadas por relacionamentos retornam `409` em vez de expor o erro
  interno do banco.

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

### O `check()` foi removido, e isso é visível no contrato

O schema **teve** 26 `check()` ([#43](https://github.com/luiztosk/sistema-doacoes-2/issues/43))
e não tem mais: a regra de valor existe em um lugar só, o zod. O motivo e o preço
estão em [`modelos-db.md`](modelos-db.md#os-check-foram-removidos). Para o
cliente, a mudança é boa — nada de `409 CONFLICT` genérico por valor inválido,
sempre `400 INVALID_VALUE` com o campo nomeado — com uma brecha, conhecida e
registrada:

- `PATCH {"entregaId":...}` em item sem `coletaId` é aceito: a invariante de que
  toda entrega vem de uma coleta é da linha, e nada a julga.

`tipoImovel` × `valorAluguel` deixou de ser regra. `POST {"tipoImovel":"PROPRIO",
"valorAluguel":1}` volta `201`, e o mesmo vale no `PATCH`. Era o único `.refine()`
que o zod não conseguia expressar como qualificador nativo, por ser entre duas
colunas; a [#44](https://github.com/luiztosk/sistema-doacoes-2/issues/44) exigiu
que o gerador de seed lesse estes schemas, e um `refine()` é opaco para qualquer
ferramenta. Se a regra voltar, o lugar dela é um `validateAssistido` em
`src/worker/api/v1.ts`, ao lado do `validateItem` — que tem o que o zod não tem,
a linha anterior.

## Valores recusados pelo banco

Duas coisas, e só duas:

- **Referência que não existe.** `coleta.doador_id`, `entrega.assistido_id`,
  `item.nome_id`/`coleta_id`/`entrega_id` são `FOREIGN KEY`, e o D1 recusa a
  escrita. `handleApiError` traduz o erro: em `POST`/`PATCH` é
  `400 INVALID_REFERENCE` (o cliente inventou o id), e em `DELETE` é
  `409 CONFLICT` (o registro tem linhas dependentes). A mensagem é a mesma para as
  cinco chaves, porque o texto do D1 não diz qual delas falhou.
- **Nome repetido no catálogo.** `categoria_item_nome_uniq` e
  `nome_item_nome_uniq` são `CREATE UNIQUE INDEX` sobre `lower(nome)`, então
  "arroz 5kg" e "Arroz 5kg" colidem. Sai como `409 CONFLICT`, que é o status
  certo — duas linhas do mesmo registro, não um valor inválido.

Fora das duas, o D1 não recusa nada: não há `check()`. A
[tabela acima](#regras-de-domínio) é a lista do que a API recusa, e vale apenas
para o que passa por ela — D1 Studio, `npm run db-seed` e scripts futuros
escrevem sem nenhum desses filtros. A migration que remove os `check()` ainda não
foi gerada, então os bancos já existentes **continuam recusando** esses valores
com `409` genérico; ver
[`modelos-db.md`](modelos-db.md#os-check-foram-removidos).

## Limitação conhecida

`categoria_item` e `nome_item` **não têm endpoints**. Como `item.nome_id` é
`NOT NULL` e referencia `nome_item`, criar um item por API só funciona contra os
registros populados por `npm run db-seed`. O CRUD dessas duas tabelas está
pendente.

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
