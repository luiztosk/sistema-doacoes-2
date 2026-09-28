# AGENTS.md

Instruções para agentes de código neste repositório. O objetivo é registrar o que
**não dá para deduzir lendo o código**.

Comece por [`docs/README.md`](./docs/README.md) para saber qual documento é a
fonte da verdade de cada assunto.

## Comandos

```bash
npm run dev      # Vite dev server (não wrangler dev)
npm test         # tsx tests/api.ts — 26 casos da API
npm run lint     # eslint .
npm run build    # lint + test + tsc -b + vite build
npm run check    # build + wrangler deploy --dry-run
```

O `build` é o que o **Cloudflare Builds executa a cada push**. A ordem é
`&&`, então um erro de lint ou um teste vermelho **impede o deploy** e deixa o
status check do GitHub vermelho — e a `main` exige que ele passe. Não "conserte"
o build removendo o lint ou o teste para destravar um merge.

`db-seed` usa `getPlatformProxy()` e escreve **sempre no banco local**. Nada de
`--remote` sem querer: `remote-db-init` e `d1 migrations apply --remote` escrevem
em produção.

## Estilo de código

- **Tabs, não espaços.** Não existe Prettier nem `.editorconfig` neste repo, então
  nada vai te avisar se você errar. As mensagens de commit e os comentários do
  código são em português, sem acento.
- Aspas duplas. Imports de tipo separados (`import type { ... }`).
- `strict`, `noUnusedLocals` e `noUnusedParameters` estão ligados. Import não
  usado **quebra o build** — é por isso que o histórico tem tantos commits
  "remove unused import".
- **`src/worker/db/seed.ts` é a exceção**: usa 4 espaços e aspas simples. Não
  reformate junto com uma mudança sem relação.

## Layout

| Caminho | O que é |
|---|---|
| `src/worker/` | API Hono, auth, banco. `index.ts` monta tudo em 26 linhas |
| `src/worker/api/v1.ts` | `registerResource` gera as 5 rotas de cada recurso |
| `src/worker/api/errors.ts` | Envelope de erro e tradução de erro do D1 |
| `src/worker/db/schema.ts` | 7 tabelas de domínio + schemas zod |
| `src/worker/db/auth-schema.ts` | **Gerado.** Não editar à mão |
| `src/react-app/` | SPA React, TanStack Router, shadcn sobre Base UI |
| `tests/api.ts` | Runner de teste escrito à mão |
| `mock_data/*.csv` | Fixtures de seed |

## API: como adicionar um recurso

1. Tabela em `src/worker/db/schema.ts` + `createInsertSchema` /
   `createUpdateSchema` (e `createSelectSchema` se precisar ler validado).
2. Entrada no `registerResources` em `src/worker/api/v1.ts`.
3. `npm run gen-drizzle` e a migration.
4. CSV em `mock_data/` — o cabeçalho precisa bater com as colunas da tabela.
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

## Testes

Não há Vitest, e o plano é não ter. O runner é um script: cada caso é um objeto no
array `casos` em `tests/api.ts`, com `nome`, `method`, `path`, e o `status`/
`code`/`mensagem` esperados. O banco é um **stub em memória** — o teste roda as
rotas de verdade, sem D1, sem rede. Ele sai com código 1 se algum caso falhar.

Para um caso novo, acrescente ao array. Não reescreva o runner.

## Coisas que vão te morder

1. **`organization_id` não existe** nas tabelas de domínio. Foi removida junto com
   a integração do Better Auth e volta com a
   [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13). **Não
   reintroduza um valor fixo de organização para "simular" o filtro** — isso viola
   a regra 1 de [`docs/seguranca.md`](./docs/seguranca.md) e é explicitamente
   proibido em `docs/api.md`.
2. **Existem 26 `check()` no banco que não estão no `schema.ts`.** A migration que
   os remove não foi gerada. Enquanto eles existirem, uma escrita rejeitada por um
   deles volta como `500 INTERNAL_ERROR`, porque `handleApiError` só traduz
   `FOREIGN KEY` e `UNIQUE constraint`.
3. **Não edite `src/react-app/route-tree.tsx`.** É gerado pelo
   `@tanstack/router-plugin` a partir de `src/react-app/routes/`. Para adicionar
   rota, crie o arquivo lá.
4. **A preview URL usa as bindings de produção.** Testar por ela escreve no
   `prod-sistema-doacoes-2`, que hoje só tem seed. Não é ambiente isolado.
5. **A API não está pronta para produção** e não deve receber dados reais: falta
   isolamento por tenant e não há `403` em lugar nenhum. Ver
   [`docs/api.md`](./docs/api.md).
6. O `notFound` em `src/worker/index.ts` responde `"Rota não encontrada."` em
   português, quebrando a regra de mensagem em inglês do `docs/api.md`. Corrigir
   junto, ou não mexe.

## Branches e commits

`main` é a única branch de longa vida. `dev` e `stage` existiram e foram
abandonadas — não criar de novo. Feature branch a partir de `main`, PR, e o merge
acontece quando o check passar e o teste manual estiver feito.

Commits no formato Conventional Commits, com o motivo no corpo quando a mudança
não for óbvia. Português, sem acento.

## Ao mexer no código, atualize o doc

| Mudança | Documento |
|---|---|
| Rota, contrato de erro, código novo | `docs/api.md` |
| Tabela, coluna, constraint, índice | `docs/modelos-db.md` |
| Script novo, passo de deploy | `docs/arquitetura.md` |
| Work item novo ou requisito coberto | `docs/backlog-pi2.md` |

Documento em `docs/archive/` é histórico: **não** atualize, e não use como
referência do estado atual.

## Dívidas conhecidas

- **O banco local e o remoto vão ser recriados do zero.** Decisão de quem
  maintaina: em vez de escrever a migration que derruba os 26 `check()`, gerar as
  migrations de um schema novo e semear em cima. Até lá, enquanto os `check()`
  existirem no banco, uma escrita rejeitada por eles volta como `500` — item 2
  acima.
- `handleApiError` não trata `CHECK constraint failed` (vira `500`).
- `next-themes` é importado por `components/ui/sonner.tsx`, mas o `<Toaster>`
  nunca é montado. Se nada usar toast, remova os dois.
- `src/react-app/lib/utils.ts` só faz `export { cn } from "cn"` e não é importado
  por ninguém — os componentes importam `cn` do pacote direto.
- `tsconfig.json` mantém `ignoreDeprecations: "6.0"`.
- Sem CI no GitHub Actions: quem roda lint e teste é o Cloudflare Builds.

## Lint: por que existem duas exceções no `eslint.config.js`

`npm run lint` fecha em **zero warning**. As duas exceções estão no config, e não
em comentário dentro do arquivo, porque ambos os arquivos são sobrescritos por
ferramenta:

- `react-refresh/only-export-components` desligada em
  `src/react-app/components/ui/**`. Os componentes do shadcn exportam o
  componente e o `cva` de variantes no mesmo arquivo, que é a convenção da lib.
  Se alguém desabilitar por arquivo, `npx shadcn add` apaga o comentário na
  próxima vez. Fora de `components/ui/` a regra continua valendo.
- `reportUnusedDisableDirectives` desligada em `worker-configuration.d.ts`, que é
  gerado por `npm run cf-typegen` e já vem com `// eslint-disable-line` que o lint
  julga desnecessário.

Se aparecer warning novo, **não** desligue a regra: ajuste o código.
