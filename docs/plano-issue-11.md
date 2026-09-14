# Plano de execução — Issue 11 (consolidado com #12)

Estado atual (repositório `main` limpo, branch `main`):

- `src/worker/db/schema.ts`: placeholder (`customers`).
- `src/worker/db/migration.sql`: placeholder (`Customers`).
- `src/worker/index.ts`: importa `customers`; `Env` usa `prod_sistema_doacoes_2`.
- `wrangler.json`: binding `prod_sistema_doacoes_2`, `migrations_dir`: `drizzle/migrations`.
- Não existe arquivo `drizzle.config`.
- `docs/modelos-db.md`: referência completa do modelo e instruções sobre `organization.id` como FK.

Escopo combinado (#11 + #12):

1. **Schema de domínio** (`docs/modelos-db.md`)
2. **Schema de autenticação** (`docs/seguranca.md`, adapter Better Auth + plugin Organization)
3. **Migrations** (`drizzle-kit`)

## Fases sugeridas

1. **Base / Configuração**
    - Criar `drizzle.config.ts`: `dialect: 'sqlite'`, `driver: 'd1-http'`, `schema: './src/worker/db/schema.ts'`, `out: './drizzle/migrations'`, `dbCredentials` com `accountId`, `databaseId`, `token` (do `.dev.vars` / `wrangler secret` ou `CLOUDFLARE_*` para local via `d1-http`). Ver docs: https://orm.drizzle.team/docs/get-started/d1-new e https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit.
    - Confirmar `nodejs_compat` (já está em `compatibility_flags`) e rodar `npx wrangler types`.

2. **Schema de domínio (`src/worker/db/schema.ts`)** (manter este caminho)
   - Substituir `customers` por tabelas do PI I (`assistido`, `doador`, `coleta`, `entrega`, `item`, `categoria_item`, `nome_item`).
   - `organization_id` obrigatório em todas.
   - IDs como `text`, booleanos com `mode: "boolean"`, timestamps com `mode: "timestamp"`.

3. **Schema de autenticação** (referência `docs/seguranca.md`)
    - Definir `auth-schema` via `generateDrizzleSchema` do adapter Better Auth (`@better-auth/drizzle-adapter`). Não criar manualmente (`docs/modelos-db.md` instrui a importar `organization` do `auth-schema` para usar como FK no domínio).

4. **Migrations**
    - `npx drizzle-kit generate` (gera `.sql` numerados em `drizzle/migrations`).
    - Aplicar localmente via `npx drizzle-kit migrate` (usa `d1-http` com as credenciais configuradas no `drizzle.config.ts`). Não usar `wrangler d1 migrations apply ... --local` para migrações geradas pelo `drizzle-kit`, pois `wrangler` não lê o `_journal.json` do `drizzle-kit`.

5. **Integração mínima**
   - Atualizar `src/worker/index.ts` para importar as novas tabelas e compilar.

6. **Autenticação** (parte do escopo #12 incorporado)
   - Configurar adapter, plugin Organization e rotas `/api/auth/*` no Hono (`docs/seguranca.md`).

7. **Verificação**
   - `npm run check` e `npm run dev` funcionando.

## Critério de aceite

- `src/worker/db/schema.ts` contém todas as tabelas do domínio com FK `organization.id`.
- `auth-schema` definido e adapter Better Auth funcionando.
- Migrations geradas em `drizzle/migrations` e aplicáveis localmente.
- `src/worker/index.ts` compila.
- Rotas `/api/auth/*` montadas.

## Dependências / Referências

- #10 (D1 provisionado, concluído).
- `docs/plano-quizena-lh.md` (Quinzena 3-4).
- `docs/backlog-pi2.md`.
- Drizzle ORM + D1 (`d1-http` com `wrangler` local): `dialect: 'sqlite'`, `driver: 'd1-http'`, `dbCredentials` com `accountId`/`databaseId`/`token`. Não usar `dbCredentials.url` para arquivo `.sqlite` local diretamente (isso seria `better-sqlite3`, não `d1-http`).

- Drizzle ORM + D1 (novo): https://orm.drizzle.team/docs/get-started/d1-new
- Drizzle Kit + D1 HTTP API: https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit


## Respostas confirmadas

- `auth-schema`: gerar pelo `generateDrizzleSchema` do adapter (`@better-auth/drizzle-adapter`), não manualmente. `docs/modelos-db.md` mostra `import { organization } from "./auth-schema"`; o adapter gera esse arquivo.
- Caminho do schema: manter `src/worker/db/schema.ts` (já referenciado por `src/worker/index.ts`). Não criar `src/db/schema.ts`.
- Scripts `local-db-init`: atualizar para apontar para `drizzle/migrations` (ex.: `wrangler d1 execute ... --file=./drizzle/migrations/0000_...sql` ou remover o script legado que aponta para `src/worker/db/migration.sql`). Remover a referência ao placeholder `migration.sql`.
- Tabela `instituicao`: **não criar** no domínio. A instituição é `organization` do Better Auth (`docs/modelos-db.md`, `docs/seguranca.md`).
