# API de domínio

Endpoints CRUD dos recursos `assistidos`, `doadores`, `coletas`, `entregas` e
`itens`. Esta é a entrega da issue #14.

## Estado da autenticação

Todas as rotas de domínio exigem uma sessão válida do Better Auth e ficam sob o
prefixo `/api/v1`. O prefixo existe para que a proteção de `/api/v1/*` nunca
alcance `/api/auth/*`, que precisa continuar público para login e cadastro.

O middleware fica em `src/worker/session-middleware.ts`
(`sessionMiddleware` + `requireSession`) e é aplicado uma única vez, em
`src/worker/index.ts`.

## ⚠️ Não está pronto para produção

O checklist de [`seguranca.md`](./seguranca.md) define o que uma rota precisa
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
    "message": "Assistido não encontrado."
  }
}
```

Códigos: `400` para dados inválidos, `401` sem sessão, `404` para recurso
inexistente, `409` para conflito com registros relacionados e `415` quando o
corpo não é enviado como `application/json`.

## Regras de domínio

- `id` é gerado pelo servidor (UUID) e não pode ser enviado pelo cliente.
- Campos desconhecidos são rejeitados com `400 UNKNOWN_FIELD`.
- Colunas `NOT NULL` sem valor são rejeitadas com `400 REQUIRED_FIELD`, e valores
  fora de um `enum` do schema com `400 INVALID_VALUE`.
- O corpo é desserializado pelo tipo da coluna: números, booleanos e
  `dataHora` (ISO 8601) chegam ao Drizzle já no formato esperado. Tipo errado
  retorna `400 INVALID_VALUE`.
- Referências a doador, assistido, coleta, entrega e nome de item precisam
  existir no banco.
- Um item novo começa em `AGUARDA_COLETA`.
- A única sequência permitida é `AGUARDA_COLETA → EM_ESTOQUE → ENTREGUE`.
- Um item marcado como `ENTREGUE` precisa de `entregaId` e `assistidoId`.
- Exclusões bloqueadas por relacionamentos retornam `409` em vez de expor o erro
  interno do banco.

## ⚠️ Validação de valores pendente

A camada de entrada hoje **desserializa**, não valida. Ou seja, a API aceita
valores que deveriam ser recusados:

| Aceito hoje | Deveria | Onde será resolvido |
|---|---|---|
| `nome: "   "` | texto não vazio | zod (`createInsertSchema` + `min(1)`) |
| `renda: -500` | maior ou igual a zero | zod (`min(0)`) e `CHECK` no banco |
| `uf: "abc"` | sigla de UF com 2 letras | zod (`regex`) e `CHECK` no banco |
| `uf: "sp"` | normalizado para `SP` | zod (`transform`) |

O motivo de não existir aqui: `drizzle-zod` já gera `z.string()`, `z.number()`,
`z.enum()` e o required a partir do `notNull` do schema, e aceita `refinements`
para o que o schema não expressa. Escrever essas regras à mão nesta camada seria
duplicar o que a biblioteca entrega.

Pendências abertas: [#42](https://github.com/luiztosk/sistema-doacoes-2/issues/42)
(zod) e [#43](https://github.com/luiztosk/sistema-doacoes-2/issues/43)
(`check()` no banco). Enquanto isso, não use dados reais — ver a seção LGPD de
[`seguranca.md`](./seguranca.md).

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
