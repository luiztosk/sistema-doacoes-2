# API de domínio

Endpoints CRUD dos recursos `assistidos`, `doadores`, `coletas`, `entregas` e
`itens`. Esta é a entrega da issue #14, com a validação de payload da #42.

## Estado da autenticação

Todas as rotas de domínio exigem uma sessão válida do Better Auth e ficam sob o
prefixo `/api/v1`. O prefixo existe para que a proteção de `/api/v1/*` nunca
alcance `/api/auth/*`, que precisa continuar público para login e cadastro.

Os middlewares ficam em `src/worker/session-middleware.ts` e
`src/worker/organization-middleware.ts`. Eles são aplicados uma única vez, em
`src/worker/index.ts`, antes das rotas de domínio.

## Isolamento por organização

O checklist de [`seguranca.md`](./seguranca.md) é aplicado a todas as rotas:

| Requisito do checklist | Estado |
|---|---|
| Exige autenticação | ✅ Cumprido |
| Valida que o usuário pertence à organização ativa | ✅ Cumprido |
| Filtra os dados por `organization_id` | ✅ Cumprido |
| Acesso por ID confere a organização do registro | ✅ Cumprido |
| Permissão do papel verificada no backend | ✅ Cumprido |
| Teste automatizado de acesso indevido (401/403 e cross-tenant) | ✅ Cumprido |

A organização vem exclusivamente de `session.activeOrganizationId`, é
confirmada na tabela `member` e é injetada pelo servidor nas escritas. O campo
`organizationId` não faz parte dos payloads aceitos. Leituras, alterações,
exclusões e validações de referências sempre usam o par `id + organization_id`;
por isso um ID de outra instituição é tratado como inexistente, sem revelar que
o registro existe.

Papéis `owner`, `admin`, `staff` e `member` podem escrever. `viewer` pode apenas
ler. Sessão sem organização ativa ou sem membership recebe `403`.

A migration não transforma automaticamente todos os usuários cadastrados em
membros de `org-1`: como o cadastro ainda está aberto no ambiente de testes,
isso daria acesso indevido aos dados da instituição. A integração de autenticação
deve criar/aceitar o membership e selecionar a organização ativa explicitamente.

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

Códigos: `400` para dados inválidos, `401` sem sessão, `403` sem organização
ativa, sem membership ou sem permissão de escrita, `404` para recurso
inexistente, `409` para conflito com registros relacionados e `415` quando o
corpo não é enviado como `application/json`. O `401` é a única resposta sem
corpo: o `requireSession` lança um `HTTPException` cru, e o status basta.

O **código** é o contrato: é nele que o cliente deve ramificar, e é ele que a
coleção do Insomnia verifica. A `message` é uma frase em inglês, escrita para
quem está olhando a resposta, e vem em duas formas — a genérica
(`Field 'renda' has an invalid value.`) para valor inválido, e a específica
quando a regra diz mais do que isso (`Field 'uf' must be one of: …`, e a frase do
próprio `refinement` para as regras de domínio).

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
- `cep` aceita `01310-100` e guarda `01310100`: o traço do ViaCEP (#16) sai na
  entrada. Oito dígitos, e nada além deles.
- Referências a doador, assistido, coleta, entrega e nome de item precisam
  existir **na organização ativa**. A API verifica isso antes da escrita e
  responde `400 INVALID_REFERENCE`; a `FOREIGN KEY` continua como segunda
  proteção no D1.
- Um item novo começa em `AGUARDA_COLETA`.
- A única sequência permitida é `AGUARDA_COLETA → EM_ESTOQUE → ENTREGUE`.
- Um item marcado como `ENTREGUE` precisa de `entregaId`.
- Quem doou e quem recebeu saem da coleta e da entrega, não de colunas do item —
  ver [`modelos-db.md`](./modelos-db.md#item).
- Exclusões bloqueadas por relacionamentos retornam `409` em vez de expor o erro
  interno do banco.

### Onde cada regra mora

Duas camadas, e o critério é o mesmo da [#43](https://github.com/luiztosk/sistema-doacoes-2/issues/43):
a forma do valor é do zod, e o que precisa da linha anterior, de outra tabela ou
da organização ativa é do handler. A `FOREIGN KEY` permanece como proteção final.

| Regra | Onde |
|---|---|
| tipo, `NOT NULL`, `enum`, conversão | `src/worker/db/schema.ts` (`<tabela>InsertSchema` / `UpdateSchema` / `SelectSchema`, gerados por `drizzle-orm/zod`) |
| `nome` não vazio, `cep` com 8 dígitos, `renda`/`valorAluguel`/contadores `>= 0`, `tipoImovel` × `valorAluguel` | `refinement` no mesmo arquivo, logo abaixo da tabela que ele julga |
| regras que dependem do estado atual do registro | `validateAssistido` e `validateItem` em `src/worker/api/v1.ts` |
| `INVALID_REFERENCE` e isolamento das referências | `requireTenantReference` em `src/worker/api/v1.ts`; a FK do D1 permanece como proteção final |
| envelope `{ error: { code, message } }` a partir dos issues do zod | `errorFromIssue` em `src/worker/api/errors.ts` |

### O `check()` foi removido, e isso é visível no contrato

O schema **teve** 26 `check()` ([#43](https://github.com/luiztosk/sistema-doacoes-2/issues/43))
e não tem mais: a regra de valor existe em um lugar só, o zod. O motivo e o preço
estão em [`modelos-db.md`](./modelos-db.md#os-check-foram-removidos). Para o
cliente, a mudança é boa — nada de `409 CONFLICT` genérico por valor inválido,
sempre `400 INVALID_VALUE` com o campo nomeado. Nos `PATCH`, o handler combina o
payload com o registro existente antes de conferir `tipoImovel` ×
`valorAluguel` e `entregaId` × `coletaId`.

## Valores recusados pelo banco

Duas coisas, e só duas:

- **Referência que não existe.** A API recusa antes da escrita uma referência
  ausente ou pertencente a outra organização. A `FOREIGN KEY` ainda protege
  escritas diretas e condições de corrida; `handleApiError` traduz uma violação
  residual em `400 INVALID_REFERENCE` no `POST`/`PATCH` e em `409 CONFLICT` no
  `DELETE`.
- **Nome repetido no catálogo.** `categoria_item_nome_uniq` e
  `nome_item_nome_uniq` são `CREATE UNIQUE INDEX` sobre `lower(nome)`, então
  "arroz 5kg" e "Arroz 5kg" colidem. Sai como `409 CONFLICT`, que é o status
  certo — duas linhas do mesmo registro, não um valor inválido.

Fora das duas, o D1 não recusa nada: não há `check()`. A
[tabela acima](#regras-de-domínio) é a lista do que a API recusa, e vale apenas
para o que passa por ela — D1 Studio, `npm run db-seed` e scripts futuros
escrevem sem nenhum desses filtros. A migration multi-tenant reconstrói as
tabelas no formato atual e remove os `check()` legados.

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
2. Crie uma conta local, vincule-a a uma organização e deixe essa organização
   ativa na sessão. O Better Auth guarda a escolha em
   `session.active_organization_id`.
3. Rode `npm run dev`.
4. Importe os dois YAMLs da pasta mais recente em `insomnia/`.
5. No Environment, preencha `SESSION_COOKIE` com o cabeçalho completo, por
   exemplo `better-auth.session_token=<token-local>`. Nunca salve o token real
   no YAML ou no Git.
6. Execute a coleção na ordem apresentada pelo Collection Runner.

A coleção usa `{{ _.BASE_URL }}` e `{{ _.SESSION_COOKIE }}`, e salva os IDs criados em variáveis como
`{{ _.ASSISTIDO_CREATED_ID }}`, então os requests dependem da execução anterior.
