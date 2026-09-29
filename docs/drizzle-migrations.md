# Migrations do Drizzle no D1

Como gerar e aplicar migrations neste projeto. O banco é **Cloudflare D1** e o
schema fica em `src/worker/db/schema.ts`.

> Este arquivo substitui um template em inglês com nomes de placeholder
> (`YOUR_DB_NAME`, `seeds/baseline.sql`, tabelas `users`/`roles` que não existem
> aqui). Os comandos abaixo são os que rodam de verdade.

## Configuração

`drizzle.config.ts` já está no jeito, e é o que faz o Wrangler achar as migrations
sozinho:

```typescript
export default defineConfig({
  schema: './src/worker/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite', // D1 é SQLite
});
```

O `out` precisa apontar para `drizzle/migrations` porque é lá que o
`wrangler.jsonc` procura, via `migrations_pattern:
"drizzle/migrations/*/migration.sql"`. **Não** declaramos `dbCredentials`: quem
aplica a migration é o Wrangler, não o `drizzle-kit`.

## Gerar uma migration

```bash
npm run gen-drizzle     # npx drizzle-kit generate
```

O drizzle-kit cria uma pasta nova em `drizzle/migrations/`, com `migration.sql` e
`snapshot.json`. Faça commit dos dois arquivos junto com o `schema.ts`.

> A pasta `20260926213838_lucky_karma` é a baseline e já está aplicada — não
> edite migration que já foi aplicada em algum ambiente. Migrations são
> imutáveis; para desfazer algo, escreva uma migration nova.

## Aplicar

```bash
# desenvolvimento (banco local, em .wrangler/state/)
wrangler d1 migrations apply prod-sistema-doacoes-2 --local

# produção
wrangler d1 migrations apply prod-sistema-doacoes-2 --remote
```

Sempre via `migrations apply`, e **nunca** `d1 execute --file`: o `execute` roda o
SQL mas não registra a migration na tabela `d1_migrations`, então o Wrangler tenta
aplicá-la de novo depois.

Os scripts que já embrulham isso:

| Script | O que faz |
|---|---|
| `npm run local-db-init` | Gera auth schema + migration, aplica no banco local, roda `wrangler types` e semeia |
| `npm run remote-db-init` | Mesma coisa, mas com `--remote` — **aplica em produção** |

## Recriar o banco do zero

Foi a decisão tomada para os 26 `check()` que ficaram no banco sem estar no
`schema.ts`: em vez de escrever a migration que os derruba, geramos as
migrations de um schema novo e semeamos em cima. Vale para o local e para o
remoto.

O `local-db-init` aplica as migrations que já existem, então recomeçar exige
descartar o estado local antes:

```bash
rm -rf .wrangler/state          # apaga o banco local (recriado no passo seguinte)
npm run local-db-init           # migrations + tipos + seed, tudo local
```

No remoto é o mesmo raciocínio, com o cuidado de sempre: criar o banco zerado e
aplicar. **Rode `--remote` só quando for de verdade** — o `db-seed` em si
escreve sempre no local, porque usa `getPlatformProxy()`.

Ordem ao mexer no schema:

1. edite `src/worker/db/schema.ts`
2. `npm run gen-drizzle` e confira o `migration.sql` que saiu
3. commit do `schema.ts` **e** da pasta da migration
4. `rm -rf .wrangler/state && npm run local-db-init` para validar do zero
5. só depois aplique no remoto

## Dados de desenvolvimento

Não existe `seeds/baseline.sql`. O seed é um script que **gera** os dados antes de
gravar, a partir dos schemas zod:

```bash
npm run db-seed          # npx tsx src/worker/db/seed.ts
```

Ele usa `getPlatformProxy()`, então escreve **sempre no banco local**, mesmo sem
`--remote`. Quem gera é `src/worker/db/generate.ts`, que valida **cada linha** com
o `*SelectSchema` da tabela antes de inserir — se o gerador produzir algo fora do
schema, o seed para e diz qual campo e qual linha. Não é mais possível o banco
divergir do que o gerador afirmou, que era a raiz dos bugs da
[#44](https://github.com/luiztosk/sistema-doacoes-2/issues/44).

O gerador é determinístico (`seed(42)`), então o banco de demonstração é o mesmo
a cada execução. Os dados de entrada do gerador são dois JSONs versionados em
`mock_data/`:

| Arquivo | O que é |
|---|---|
| `municipios.json` | Pares cidade/UF do IBGE, capital mais três municípios por UF |
| `catalogo.json` | As 9 categorias e os 114 nomes de item do catálogo |

**O insert é sem tolerância a conflito.** Não há mais `onConflictDoNothing()`: um
id repetido ou um nome de catálogo repetido estoura o `UNIQUE` e o seed sai com
código 1, em vez de pular a linha em silêncio. Rodar o seed duas vezes seguidas
falha — isso é intencional, o banco de demonstração se recria do zero.

Depois de `git pull`, o caminho é:

```bash
npm run local-db-init    # migration + tipos + seed, tudo local
```

## Regras da casa

1. **Nunca use `drizzle-kit push`.** Ele ignora os arquivos de migration e quebra
   a paridade entre local e remoto. Sempre `generate`.
2. **`auth-schema.ts` é gerado.** Não edite à mão: rode `npm run gen-auth`, que
   chama o gerador do Better Auth e escreve o arquivo. É ele que produz as tabelas
   `user`, `session`, `account`, `organization`, `member`, `invitation` e
   `verification`.
3. **Migrations aplicadas não se editam.** Se algo está errado, escreva outra.
4. **Nunca commite `.wrangler/`.** Já está no `.gitignore`; ele guarda o banco
   local.
5. **Não rode nada com `--remote` sem querer.** `remote-db-init` e
   `migrations apply --remote` escrevem em produção.
