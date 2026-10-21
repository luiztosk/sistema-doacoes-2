# Como adicionar um recurso (API + banco)

> **Congelado nesta rodada.** O esquema e o contrato da API não mudam. Este
> documento é o registro de como se faria, não uma tarefa. Para as telas, leia
> [`../frontend-tabela.md`](../frontend-tabela.md) e
> [`../frontend-formulario.md`](../frontend-formulario.md).
>
> A branch `mess/but-in-a-good-way` levanta o congelamento, porque o modelo de
> estoque está sendo trocado por um ledger — ver a exceção no
> [`../../AGENTS.md`](../../AGENTS.md).

## API: como adicionar um recurso

1. **Contrato em `src/schemas/api/<recurso>.ts`** — zod escrito à mão, e é a
   fonte da verdade. `<recurso>Schema` (detalhe), `<recurso>ListSchema` (a
   lista, mais estreita), `<recurso>CreateSchema`, `<recurso>UpdateSchema` e,
   se o endpoint filtra, `<recurso>ListQuerySchema`. As regras:
   - **sem `.refine()`** — regra que atravessa dois campos vai no handler;
   - **schema de resposta é `.strict()`** — é ele que reprova uma resposta com
     campo a mais;
   - **a lista é mais estreita que o detalhe**, e isso é contrato.
2. Tabela em `src/schemas/db/` — o Drizzle segue o contrato, e não o
   contrário. Os enums **se importam** de `src/schemas/api/enums.ts`.
3. Rota em `src/worker/routes/<area>/<recurso>.ts`, registrada em
   `src/worker/routes/<area>/index.ts` e composta em `src/worker/index.ts`. O
   schema entra no documento do OpenAPI pelo registro:
   `app.openAPIRegistry.register("<Recurso>", <recurso>Schema)` — e a rota usa
   o schema **devolvido** pelo registro, que é o que vira `$ref`.
4. `bun run gen-drizzle` e a migration.
5. Gerador em `scripts/generate.ts` — a tabela entra em `ROWS_PER_TABLE` e
   ganha uma função `create*` que valida cada linha com o schema do
   **contrato**.
6. Casos em `tests/api.ts`.
7. **Atualizar [`api.md`](api.md)** (seção de endpoints e, se vale, a tabela de
   códigos de erro) e [`modelos-db.md`](modelos-db.md).

Contrato, que não muda por recurso:

- sucesso: `200`/`201` com `{"data": ...}`; `DELETE` devolve `204` sem corpo
- erro: `{"error": {"code": "UPPER_SNAKE", "message": "frase em inglês"}}`
- `401` é a única resposta sem corpo
- uma requisição devolve **no máximo um** erro (o validador para no primeiro)
- validação com zod na borda, contra o schema do **contrato**
- `id` é gerado pelo servidor e rejeitado no corpo (`READ_ONLY_FIELD`)

## A exceção: um recurso que mexe no estoque

Um recurso novo que mexe em quantidade de estoque **não** é um CRUD. Ele vira um
movimento no ledger, e a forma é sempre a mesma:

1. Gravar a entrada no `ledger`, com o `kind` que descreve o efeito. O
   `trigger ledger_guard` é a guarda: se a operação estouraria o saldo, o
   statement **não é escrito**.
2. Mexer no saldo de `inventory_item`, guardado pela existência da entrada:
   `UPDATE inventory_item SET ... WHERE id = :id AND EXISTS (SELECT 1 FROM ledger
   WHERE id = :ledger_id)`.
3. Os dois no mesmo `db.batch()`, **nesta ordem** — a guarda vem primeiro, o
   saldo depois. A ordem invertida faz o segundo statement ler o saldo já
   mutado, e o ledger perde a entrada.

O `kind` novo entra na lista de
[`modelos-db.md`](modelos-db.md#o-que-cada-movimento-faz) e, se ele tiver
guarda própria, no `ledger_guard`.

## A exceção: um recurso com FK para outro

A referência é `FOREIGN KEY` no D1, e o `handleApiError` traduz a recusa em
`400 INVALID_REFERENCE` (no `POST`/`PATCH`) ou `409 CONFLICT` (no `DELETE`).
Nada a fazer no zod.
