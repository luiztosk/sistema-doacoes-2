# Migrations do Drizzle no D1

Como gerar e aplicar migrations neste projeto. O banco é **Cloudflare D1** e o
schema fica em `src/schemas/db/`.

> Este arquivo substitui um template em inglês com nomes de placeholder
> (`YOUR_DB_NAME`, `seeds/baseline.sql`, tabelas `users`/`roles` que não existem
> aqui). Os comandos abaixo são os que rodam de verdade.

## Configuração

`drizzle.config.ts` já está no jeito, e é o que faz o Wrangler achar as migrations
sozinho:

```typescript
export default defineConfig({
  schema: './src/schemas/db/schemas.ts',
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
bun run gen-drizzle     # drizzle-kit generate
```

O drizzle-kit cria uma pasta nova em `drizzle/migrations/`, com `migration.sql` e
`snapshot.json`. Faça commit dos dois arquivos junto com o schema.

> A pasta `20260929215055_crazy_harrier` é a baseline e já está aplicada — não
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
| `bun run db-reset` | Apaga o banco local, gera o auth schema e a migration, aplica as migrations, roda `wrangler types` e semeia |
| `bun run db-reset-remote` | Mesma coisa, mas no remoto — **aplica em produção** |

O `db-reset` é o caminho do zero, e é o que o `bun run db-init --local` faz sem
apagar o estado.

## Recriar o banco do zero

Foi a decisão tomada para os 26 `check()` que ficaram no banco sem estar no
`schema.ts`: em vez de escrever a migration que os derruba, geramos as
migrations de um schema novo e semeamos em cima. Vale para o local e para o
remoto.

O `db-reset` **apaga o estado local** antes de aplicar, então recomeçar do
zero é um comando só:

```bash
bun run db-reset                # apaga o banco local, aplica, e semeia
```

No remoto, o `db-reset-remote` faz o mesmo, e o passo de apagar é o
`bun run db-wipe --remote`: ele derruba **todas** as tabelas — inclusive a de
bookkeeping `d1_migrations` — para que as migrations voltem a ser aplicadas do
zero. Sem derrubar a de bookkeeping, o Wrangler acredita que as migrations
antigas já rodaram, e não reaplica nenhuma.

> ⚠️ **A ordem de derrubar as tabelas importa.** O D1 **recusa** `DROP TABLE` de
> uma tabela que outra referencia, e a recusa sai como erro, não como aviso. O
> `db-wipe` lê o schema do **próprio banco** e derruba os filhos primeiro — e
> não uma lista escrita à mão, que envelhece sem ninguém perceber.

> ⚠️ **O seed escreve no remoto por um truque de configuração.** O
> `getPlatformProxy()` resolve a binding D1 pelo `wrangler.jsonc`, e ela aponta
> para o **local** por padrão. Para escrever no remoto, a binding precisa de
> `"remote": true` — e no arquivo a linha está **comentada**, como dica. O
> `db-init` descomenta a linha antes do seed e restaura o arquivo depois. Por
> isso ele **descomenta** a linha em vez de procurá-la por texto: procurar por
> `"remote": true` encontra a linha comentada, acha que já está ligado, e o
> seed vai para o banco local sem avisar.

**Rode `--remote` só quando for de verdade** — o `db-seed` em si escreve sempre
no local, porque usa `getPlatformProxy()`.

Ordem ao mexer no schema:

1. edite `src/schemas/db/`
2. `bun run gen-drizzle` e confira o `migration.sql` que saiu
3. commit do schema **e** da pasta da migration
4. `bun run db-reset` para validar do zero
5. só depois aplique no remoto

## Dados de desenvolvimento

Não existe `seeds/baseline.sql`. O seed é um script que **gera** os dados antes de
gravar, a partir do contrato:

```bash
bun run db-seed          # tsx scripts/seed.ts
```

Ele usa `getPlatformProxy()`, então escreve **sempre no banco local**, mesmo sem
`--remote`. Quem gera é `scripts/generate.ts`, que valida **cada linha** com o
schema do contrato antes de inserir — se o gerador produzir algo fora do
schema, o seed para e diz qual campo e qual linha. Não é mais possível o banco
divergir do que o gerador afirmou, que era a raiz dos bugs da
[#44](https://github.com/luiztosk/sistema-doacoes-2/issues/44).

O gerador é determinístico (`seed(42)`), então o banco de demonstração é o mesmo
a cada execução. Os dados de entrada do gerador são dois JSONs versionados em
`mock_data/`:

| Arquivo | O que é |
|---|---|
| `municipios.json` | Pares cidade/UF do IBGE, capital mais três municípios por UF |
| `catalogo.json` | As 9 categorias e os 130 nomes de item do catálogo |

**O insert é sem tolerância a conflito.** Não há mais `onConflictDoNothing()`: um
id repetido ou um nome de catálogo repetido estoura o `UNIQUE` e o seed sai com
código 1, em vez de pular a linha em silêncio. Rodar o seed duas vezes seguidas
falha — isso é intencional, o banco de demonstração se recria do zero.

E o seed **recusa um banco que já tem dados**, antes do primeiro insert, com
uma mensagem que diz o que fazer:

```
o banco ja tem 100 beneficiario(s) — o seed nao aceita um banco com dados.
Rode `bun run db-reset` para recriar o banco do zero.
```

Sem essa checagem, o erro que aparece é o do SQLite — `UNIQUE constraint
failed: beneficiary.id` — que não diz se o problema é o banco ou o seed.

### O seed do modelo com ledger

O gerador **não sorteia saldo**: ele sorteia os **movimentos** — doações,
entregas, contagens, ajustes — e deriva o saldo, aplicando cada movimento numa
simulação em memória. O `inventory_item` é escrito no fim, com o resultado. Duas
consequências, e as duas valem:

- o gerador só sorteia uma entrega para item que tem disponibilidade, então ele
  respeita a mesma guarda que a API;
- e ele **valida as duas invariantes antes de devolver**, então um seed que
  produzisse drift falharia em vez de escrever.

E o seed escreve os movimentos **na mesma ordem que a API** — a entrada no
ledger e, logo depois, o saldo — porque a guarda mora no trigger, e o trigger
lê o saldo do item. Sem essa ordem, o trigger veria o saldo zerado e recusaria a
primeira reserva.

### O banco do zero

O `bun run db-reset` **apaga o estado local** e refaz tudo, na ordem:

| Passo | O que faz |
|---|---|
| 1 | `gen-auth` — gera `src/schemas/db/auth.ts` com o gerador do Better Auth |
| 2 | `gen-drizzle` — gera a migration, se o schema do banco mudou |
| 3 | `wrangler d1 migrations apply --local` — aplica as migrations |
| 4 | `cf-typegen` — gera `worker-configuration.d.ts` |
| 5 | `db-seed` — gera e grava os dados |

O passo 2 é o único que **pode escrever no repo**: ele cria uma migration nova
quando o schema mudou, e ela precisa ser revisada e commitada antes de seguir.
Num banco já em dia, ele não cria nada.

Depois de `git pull`, o caminho é:

```bash
bun run db-reset         # banco do zero: apaga, aplica, e semeia
```

## Regras da casa

1. **Nunca use `drizzle-kit push`.** Ele ignora os arquivos de migration e quebra
   a paridade entre local e remoto. Sempre `generate`.
2. **`src/schemas/db/auth.ts` é gerado.** Não edite à mão: rode `bun run gen-auth`,
   que chama o gerador do Better Auth e escreve o arquivo. É ele que produz as tabelas
   `user`, `session`, `account`, `organization`, `member`, `invitation` e
   `verification`.
3. **Migrations aplicadas não se editam.** Se algo está errado, escreva outra.
4. **Nunca commite `.wrangler/`.** Já está no `.gitignore`; ele guarda o banco
   local.
5. **Não rode nada com `--remote` sem querer.** `db-reset-remote` e
   `migrations apply --remote` escrevem em produção.
