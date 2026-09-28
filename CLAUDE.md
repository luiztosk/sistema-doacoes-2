# CLAUDE.md

As instruções deste projeto estão em **[`AGENTS.md`](./AGENTS.md)**. Leia esse
arquivo e siga-o; este é apenas um ponteiro para evitar duas cópias divergindo.

Quick reference:

| | |
|---|---|
| Comandos | `npm run dev` · `npm test` · `npm run lint` · `npm run build` · `npm run check` |
| Estilo | **Tabs**, aspas duplas, imports de tipo separados |
| Índice da documentação | [`docs/README.md`](./docs/README.md) |
| Contrato da API | [`docs/api.md`](./docs/api.md) |
| Modelo de dados | [`docs/modelos-db.md`](./docs/modelos-db.md) |
| fluxo de branches e deploy | [`docs/arquitetura.md`](./docs/arquitetura.md) |
| O que falta implementar | [`docs/backlog-pi2.md`](./docs/backlog-pi2.md) |

Os três erros que mais custam tempo aqui:

1. `organization_id` **não existe** nas tabelas de domínio, e a API não filtra por
   organização. Não introduza um valor fixo para simular.
2. Não edite `src/react-app/route-tree.tsx` nem `src/worker/db/auth-schema.ts` —
   os dois são gerados.
3. O `build` roda `lint` e `test` antes do deploy. Não remova nenhum dos dois da
   cadeia para destravar um merge: a `main` exige o check, e um teste vermelho
   é justamente o que ele existe para pegar.
