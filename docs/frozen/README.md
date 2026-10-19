# `frozen/`

Leitura obrigatória para as telas. **Não mexa em nada daqui nesta rodada.**

| Documento | O que é |
|---|---|
| [`api.md`](api.md) | O contrato dos endpoints, o envelope de erro e os códigos |
| [`modelos-db.md`](modelos-db.md) | As tabelas de domínio, o ledger e as invariantes |
| [`seguranca.md`](seguranca.md) | A instituição é a instância; autorização, segredos e LGPD |
| [`drizzle-migrations.md`](drizzle-migrations.md) | Como gerar e aplicar migration |
| [`como-adicionar-recurso.md`](como-adicionar-recurso.md) | Como se criaria tabela + endpoint, se algum dia mudar |

## Por que "frozen" e não "archive"

[`../archive/`](../archive/) é o que **já aconteceu** e não é mais verdade.
Aqui é o que **funciona e não deve ser tocado**: é o contrato em que a tela
opera, não uma lista de coisas a atualizar.

> ⚠️ **O contrato de estoque está em transição.** O modelo de contadores virou
> ledger em 19/10/2026, e [`api.md`](api.md) e
> [`modelos-db.md`](modelos-db.md) já descrevem o **novo** contrato, que está
> **em implementação** na branch `mess/but-in-a-good-way`. O desenho anterior
> está em [`../future/README.md`](../future/README.md) como leitura histórica.

O código é a fonte da verdade do modelo, não estes documentos. As colunas e os
tipos saem de `src/schemas/db/` — do `*SelectSchema`, do
`*InsertSchema` e dos enums exportados. Um doc de 150 linhas sobre colunas
envelhece; o schema é conferido pelo gerador do seed a cada linha.

Quando o backend voltar a mudar, o que muda é: mova o arquivo para `docs/`,
atualize os links, e troque a frase de congelamento do
[`AGENTS.md`](../../AGENTS.md).
