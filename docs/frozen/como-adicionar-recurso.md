# Como adicionar um recurso (API + banco)

> **Congelado nesta rodada.** O esquema e o contrato da API não mudam. Este
> documento é o registro de como se faria, não uma tarefa. Para as telas, leia
> [`../frontend-tabela.md`](../frontend-tabela.md) e
> [`../frontend-formulario.md`](../frontend-formulario.md).

## API: como adicionar um recurso

1. Tabela em `src/worker/db/schema.ts` + `createInsertSchema` /
   `createUpdateSchema` (e `createSelectSchema` se precisar ler validado).
2. Entrada no `registerResources` em `src/worker/api/v1.ts`.
3. `npm run gen-drizzle` e a migration.
4. Gerador em `src/worker/db/generate.ts` — a tabela entra em
   `ROWS_PER_TABLE` e ganha uma função `criar*` que valida cada linha com o
   `*SelectSchema`.
5. Casos em `tests/api.ts`.
6. **Atualizar `docs/api.md`** (seção de endpoints e, se vale, a tabela de
   códigos de erro).

Contrato, que não muda por recurso:

- sucesso: `200`/`201` com `{"data": ...}`; `DELETE` devolve `204` sem corpo
- erro: `{"error": {"code": "UPPER_SNAKE", "message": "frase em inglês"}}`
- `401` é a única resposta sem corpo
- uma requisição devolve **no máximo um** erro (o validador para no primeiro)
- validação com zod na borda, gerada da própria tabela com `drizzle-orm/zod`
- `id` é gerado pelo servidor e rejeitado no corpo (`READ_ONLY_FIELD`)
