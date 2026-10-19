# AGENTS.md

Instruções para agentes de código neste repositório. O objetivo é registrar o que
**não dá para deduzir lendo o código**.

Comece por [`docs/README.md`](docs/README.md) para saber qual documento é a
fonte da verdade de cada assunto.

> **O branch `mess/but-in-a-good-way` está no meio de uma migração de modelo.**
> O contrato novo (estoque como **ledger**) está escrito em
> [`docs/frozen/`](docs/frozen/README.md), e o código ainda está no modelo
> antigo. O estado exato do que está quebrado e do que falta está em
> [`docs/estado-atual.md`](docs/estado-atual.md). Leia os dois antes de
> mexer em qualquer coisa de estoque.

## Comandos

```bash
npm run dev            # Vite dev server (não wrangler dev)
npm test               # tsx tests/api.ts — 28 casos da API
npm run test:inventory # tsx tests/inventory.ts — as operações de estoque, contra o D1 local
npm run lint           # eslint .
npm run build          # lint + tsc -b + vite build
npm run check          # build + wrangler deploy --dry-run
npm run update-openapi # sobe o dev server, baixa o openapi.json e regenera schema.d.ts
```

> ⚠️ **O `npm test` saiu do gate do build.** `package.json` tem `lint && tsc -b &&
> vite build`, e o `npm test` **não** roda no build — apesar de este arquivo e
> [`docs/arquitetura.md`](docs/arquitetura.md) dizerem, durante anos, que um
> teste vermelho bloqueava o deploy. **Ele volta ao gate** como parte do plano
> do ledger.

O `build` é o que o **Cloudflare Builds executa a cada push**, em `&&`, então um
erro de lint **impede o deploy** e a `main` exige que o check passe. Não remova
o lint da cadeia para destravar um merge.

`db-seed` usa `getPlatformProxy()` e escreve **sempre no banco local**. Nada de
`--remote` sem querer: `remote-db-init` e `d1 migrations apply --remote` escrevem
em produção.

## Estilo de código

- **Tabs, não espaços.** Não existe Prettier nem `.editorconfig` neste repo, então
  nada vai te avisar se você errar. As mensagens de commit são em português, sem
  acento.
- **Identificadores em inglês.** Variáveis, funções, parâmetros, chaves de objeto e
  tipos. A exceção são os nomes de campo que vêm do schema ou da API —
  `cestaBasica`, `tipoImovel`, `valorAluguel` — que seguem exatamente como estão
  no banco, porque são o contrato com o servidor.
- **Interface visível em português do Brasil.** Títulos, rótulos de coluna, botões,
  mensagens de erro e valores de menu. Um cabeçalho de coluna é interface e vai
  em português; o `accessorKey` da mesma coluna é identificador e vai em inglês.
- **O valor de um enum é inglês; a string que o mostra é português.** Os enums do
  modelo de estoque são `KG`, `L`, `UNIT`, `PACK`, `BOX`, `RECEIVED`, `VOID`,
  `OPEN`, `COMPLETED`, `CANCELLED`, `COUNT`, `RECEIVE`, `RESERVE`, `ISSUE`,
  `RELEASE`, `ADJUST`, `REVERSE`, `STOCKTAKE`, `DONOR_RETURN`, `LOSS`, `DAMAGE` e
  `CORRECTION` — é o que vai no banco e no contrato da API. **Exibi-lo cru está
  errado**: `PACK` e `OPEN` são inglês, e a interface é português. A tela carrega um
  mapa de rótulo e mostra "Pacote" e "Em aberto".
  Isso vale ao contrário do que a tela de `beneficiary` faz, e o motivo é que ali
  o valor **é** a interface: `uf` é "SP" e `tipoImovel` é "ALUGADO", que em
  português já são o que o usuário lê. `cityLabel` mostra `cidade / uf` cru e está
  certo. Enum com valor em português dispensa mapa; enum com valor em inglês exige
  um, e é um arquivo só, no `react-app`, porque é onde a tradução vive.
- **Zero comentário de código.** Nem linha, nem bloco, nem JSDoc. Quem lê raciocina
  no código em vez de varrer comentário, e um comentário desatualizado é pior do
  que nenhum. Comentário só existe apontando uma issue **aberta** ou marcando um
  TODO, com o número ou o link. Duas exceções: os componentes do shadcn em
  `components/ui/**`, que chegam com os comentários da lib e são sobrescritos por
  `npx shadcn add`; e este AGENTS.md, que é o lugar de verdade para tudo que era
  comentário. **Se o código exige uma explicação para ser lido, a explicação vai
  aqui** — em "Coisas que vão te morder" ou na seção do assunto — e não no
  arquivo.
- Aspas duplas. Imports de tipo separados (`import type { ... }`).
- `strict`, `noUnusedLocals` e `noUnusedParameters` estão ligados. Import não
  usado **quebra o build** — é por isso que o histórico tem tantos commits
  "remove unused import".
- **`scripts/seed.ts` e `scripts/generate.ts` usam 4 espaços e aspas simples.**
  Não reformate junto com uma mudança sem relação.
- **Espaço em vez de tab ainda existe em alguns arquivos** e nenhum foi arrumado:
  `src/auth.config.ts`, `src/schemas/db/auth.ts` e
  `src/react-app/lib/hooks/use-mobile.ts`, que é cópia do shadcn. Não há linha
  que misture tab e espaço, então um reformate é mecânico e vira diff de arquivo
  inteiro: só vale em mudança que já é sobre o arquivo.
- **`src/schemas/zod/inventory/` e `src/worker/routes/inventory/` usam 4 espaços
  e aspas simples.** Vieram de uma escrita fora do padrão da casa. Não espalhe.

## Layout

| Caminho | O que é |
|---|---|
| `src/worker/` | API Hono. `index.ts` monta tudo e compõe as rotas OpenAPI |
| `src/worker/routes/{contacts,inventory}/` | Uma rota por recurso, sobre `@hono/zod-openapi` |
| `src/worker/api/errors.ts` | Envelope de erro e tradução de erro do D1 |
| `src/schemas/api/` | **O contrato da API.** Zod escrito à mão, um arquivo por recurso. A fonte da verdade |
| `src/schemas/db/` | As tabelas do Drizzle. `schemas.ts` é o barrel que o `drizzle.config.ts` consome |
| `src/schemas/db/auth.ts` | **Gerado.** Não editar à mão |
| `src/schemas/zod/` | **Deprecado.** Zod gerado da tabela, com `drizzle-orm/zod`. Sai com a migração das rotas |
| `src/schemas/openapi/schema.d.ts` | **Gerado** pelo `openapi-typescript`, a partir do `openapi.json` |
| `openapi.json` | **Gerado** pelo servidor. É o contrato publicado, e a fonte do tipo do cliente |
| `src/react-app/` | SPA React, TanStack Router, shadcn sobre Base UI |
| `src/react-app/routes/` | Arquivo = rota. É o TanStack Router que gera o `route-tree.tsx` |
| `src/react-app/lib/queries/` | Um arquivo por recurso, mais `fetch-client.ts`. `$api` é o client tipado |
| `src/react-app/components/ui/` | **Gerado** pelo shadcn. Não editar à mão |
| `src/react-app/lib/hooks/use-mobile.ts` | **Gerado** pelo shadcn. Não editar à mão |
| `src/react-app/components/` | Agrupado por **tipo** e, dentro do tipo, por área: `tables/{contacts,inventory,utils}/`, `forms/{auth,contacts,inventory}/` |
| `scripts/generate.ts` | Gerador de dados do seed (faker + zod) |
| `scripts/seed.ts` | Semeadura, via `getPlatformProxy()` |

### O contrato da API vem primeiro

> Decidido em 19/10/2026. Ver
> [`docs/arquitetura.md`](docs/arquitetura.md#o-contrato-da-api-vem-primeiro).

**O zod do contrato é escrito à mão, em `src/schemas/api/`.** O schema da
tabela é outra coisa, e a resposta de uma não decide a outra:

| Schema | É o quê |
|---|---|
| `<recurso>Schema` | a resposta do **detalhe** |
| `<recurso>ListSchema` | a linha da **lista** — mais estreita |
| `<recurso>CreateSchema` | o corpo do `POST` |
| `<recurso>UpdateSchema` | o corpo do `PATCH` |
| `<recurso>ListQuerySchema` | os query params |

Três regras que os schemas de contrato obedecem, e que o TypeScript não
verifica:

1. **Nenhum `.refine()` num schema de contrato.** A resposta da API tem que
   estar em inglês, e ela só está porque o `errorFromIssue` reconstrói a frase
   a partir do `issue.code` e ignora o `issue.message` — **menos** no ramo
   `"custom"`, que é o que `.refine()` produz. Regra que atravessa dois campos
   vai no handler, com `apiError(...)` e frase em inglês.
2. **Schema de resposta é `.strict()`.** É o `.strict()` que reprova uma lista
   carregando campo a mais — o zod, sem ele, *descarta* o campo e o bug passa.
3. **A lista é mais estreita que o detalhe, e é contrato.**
   `beneficiaryListSchema` tem 8 campos e `beneficiarySchema` tem 26. A
   validação da resposta reprova a lista se ela vier com `logradouro`.

As mensagens dos campos são **em português**, para o formulário. A API responde
em inglês pelo mecanismo do item 1.

`occurredAt` viaja como **ISO 8601 com fuso** (`z.iso.datetime({ offset: true })`),
e vira `Date` na rota. `z.coerce.date()` aceitaria data sem fuso, que é ambígua.

**O `openapi.json` é gerado, nunca escrito à mão.** O zod v4 tem conversão
nativa para JSON Schema, e `draft-2020-12` é o dialeto do OpenAPI 3.1. Para o
documento ter schemas **nomeados** (e as rotas referenciarem por `$ref`), o
schema é registrado no registry do app — e o registro devolve um schema novo,
que é o que a rota usa:

```ts
const Beneficiary = app.openAPIRegistry.register("Beneficiary", beneficiarySchema);
```

### Frontend: onde um arquivo novo vai

Agrupamento é por **tipo** e, dentro do tipo, por **área**: a tabela de
beneficiários fica em `components/tables/contacts/beneficiaries.tsx` e o
formulário em `components/forms/contacts/beneficiary.tsx`. O arquivo se chama só
`<recurso>.tsx`, porque a pasta já diz o tipo — sufixo `-table` ou `-form` no
nome seria repetir a pasta. `components/forms/auth/` é a exceção: é a superfície
do Better Auth, não um tipo.

Plural onde é lista, singular onde é registro: `tables/contacts/beneficiaries.tsx`
e `lib/queries/contacts/beneficiaries.ts` listam, `forms/contacts/beneficiary.tsx`
age sobre um.

**Um formulário por recurso, para criar, ver e editar.** Não existe
`create-beneficiary.tsx`, `view-beneficiary.tsx` nem `edit-beneficiary.tsx`: o
componente recebe o registro por prop opcional e é a rota que decide o modo —
`beneficiary` ausente é criação, presente é visualização. O terceiro modo é estado
interno (`isEditing`), não prop nem rota, porque "ver" e "editar" são a mesma
tela.

As duas receitas que espelham isso estão em
[`docs/frontend-tabela.md`](docs/frontend-tabela.md) e
[`docs/frontend-formulario.md`](docs/frontend-formulario.md).

São três modos, e só dois têm botão de envio:

| Modo | `beneficiary` | `isEditing` | Campos | Topo | Rodapé |
|---|---|---|---|---|---|
| visualização | presente | `false` | travados | `Editar` + `Voltar para a lista` | nada |
| edição | presente | `true` | liberados | `Voltar para a lista` | `Salvar alterações` + `Cancelar` |
| criação | ausente | `true` | liberados | `Voltar para a lista` | `Cadastrar beneficiário` |

O `Cancelar` faz `form.reset()` e volta para `false`, porque voltar sem
descartar deixaria a tela mostrando alteração que não foi salva.

**O bloqueio vem do `EditableProvider`, não de uma prop por campo.** As
primitivas de `forms/fields.tsx` leem `editable` de um contexto, senão seriam 25
`disabled={...}` repetidos no `beneficiary.tsx`. O contexto tem `true` como
padrão, então uma primitiva usada fora do provider fica editável.

O **nome do símbolo** continua descrevendo o que a coisa é: o arquivo é
`tables/contacts/beneficiaries.tsx` e exporta `BeneficiariesTable`. Caminho diz
onde mora, símbolo diz o que é, e os dois são eixos separados — como o
`accessorKey` em inglês e o `header` em português da mesma coluna.

Nome de arquivo em **kebab-case** (`login-form.tsx`), e não PascalCase. Os
formulários de auth já foram renomeados porque eram os únicos em PascalCase.

Toda chamada ao servidor fica em `lib/queries/<area>/<recurso>.ts` e só lá. O
sufixo `-queries` e o `-mutations` não existem: a pasta já diz, e um recurso que
lê e escreve fica em **um** arquivo só. A pasta existe para separar a camada de
servidor de `lib/` — que guarda o que não fala com o servidor, como
`auth-client.ts`, `query-client.ts` e `navigation.ts`.

O client é o **`$api`** do `openapi-react-query`, e ele **tipa a partir do
`openapi.json`** — não há tipo de resposta escrito à mão. Os símbolos seguem o
nome do [guia de
`queryOptions`](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)
do TanStack: `<entidade>Options` para ler, `<verbo><Entidade>Mutation()` para
escrever, porque as mutações são hooks. Então `beneficiariesOptions`,
`beneficiaryOptions(id)`, `createBeneficiaryMutation()` e
`updateBeneficiaryMutation()` — e não `beneficiariesQueryOptions`. As chaves de
query saem de uma factory por recurso (`beneficiaryKeys`), no spirit do
[Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys),
para o `invalidateQueries` ter um alvo nomeado em vez de um array solto.

**O estado do formulário é o payload** — o tipo dos valores é o
`<recurso>InsertSchema` sem o `undefined`, e quem converte é o `onChange` da
primitiva, não o `onSubmit`. Por isso dá para validar com o `*InsertSchema`
direto, nos dois modos: o de update torna `name` opcional e o de insert é o mais
estrito.

## Telas: leia antes de escrever

[`docs/frontend-tabela.md`](docs/frontend-tabela.md) e
[`docs/frontend-formulario.md`](docs/frontend-formulario.md) são a receita das
telas de recurso, e apontam para o código a espelhar em vez de descrever de
novo.

**O backend está congelado nesta rodada.** Não crie tabela, coluna, endpoint,
migration nem código de erro, e não edite nada em `src/worker/`. Se a tela
precisa de um campo que não existe, pare e pergunte — não invente o schema. O
`docs/frozen/` é leitura: ele descreve o contrato em que a tela opera, não uma
lista de coisas a atualizar. Como se faria uma mudança lá está em
[`docs/frozen/como-adicionar-recurso.md`](docs/frozen/como-adicionar-recurso.md).

### Exceção: a branch do ledger lifts o congelamento

A branch `mess/but-in-a-good-way` tem **autorização para qualquer mudança
quebrante que a gente achar necessária** — sem perguntar e sem tratar
`docs/frozen/` como limite. Isso vale enquanto o modelo novo estiver em
implementação nessa branch, e na `main` o congelamento acima continua valendo.

O que isso libera: trocar o modelo de estoque inteiro (o ledger substitui os
contadores e as tabelas de linha), trocar endpoint e rota, reescrever o gerador
do seed, reescrever os casos de [`tests/api.ts`](tests/api.ts) e as telas de
estoque.

O que o congelamento **não** segurava, e que continua de pé, porque não é sobre
o modelo: as regras de [`docs/frozen/seguranca.md`](docs/frozen/seguranca.md) —
em particular `organization_id` fixo continua proibido e `check()` continua sem
criação. E o contrato de [`docs/frozen/api.md`](docs/frozen/api.md) continua
valendo no que é segurança e forma do erro: `401` sem corpo, no máximo um erro
por requisição, e mensagem em inglês.

**O modelo de estoque é o ledger.** O contrato está em
[`docs/frozen/modelos-db.md`](docs/frozen/modelos-db.md) e
[`docs/frozen/api.md`](docs/frozen/api.md), e o raciocínio da troca, em
[`docs/arquitetura.md`](docs/arquitetura.md#o-modelo-de-estoque-virou-ledger).
`donation_line` e `delivery_line` **saíram**: o conteúdo de um documento se lê
no ledger filtrando por `ref_id`. `inventory_item.on_hand` e
`inventory_item.reserved` continuam existindo, mas como **cache** — o ledger é
a verdade.

O contrato em si, que não muda por recurso: sucesso é `200`/`201` com
`{"data": ...}` e `DELETE` devolve `204` sem corpo; erro é
`{"error": {"code": "UPPER_SNAKE", "message": "frase em inglês"}}`; `401` é a
única resposta sem corpo; uma requisição devolve **no máximo um** erro; a
validação é o zod da própria tabela; e `id` é gerado pelo servidor.

## Testes

Não há Vitest, e o plano é não ter. O runner é um script: cada caso é um objeto no
array `casos` em `tests/api.ts`, com `nome`, `method`, `path`, e o `status`/
`code`/`mensagem` esperados. O banco é um **stub em memória** — o teste roda as
rotas de verdade, sem D1, sem rede. Ele sai com código 1 se algum caso falhar.

Para um caso novo, acrescente ao array. Não reescreva o runner.

> ⚠️ **As duas suítes estão desligadas no meio da migração.** `registerResources`
> está comentado em `tests/api.ts` e em `tests/inventory.ts`, então nenhuma rota
> é montada, e `tests/api.ts` ainda aponta para endpoints que saíram
> (`/api/v1/assistidos`, `/api/v1/coletas`, `/api/v1/itens`). As duas suítes são
> reescritas no plano do ledger.

## Coisas que vão te morder

1. **A instituição é a instância.** Não existe `organization_id` em nenhuma
   tabela de domínio, e **não vai existir**: uma instância serve uma
   instituição, e outra instituição é outro deployment. O plugin `organization()`
   do Better Auth **está ativo** e as tabelas de organização existem — é a isca
   mais fácil do repo, porque parece que o filtro existe. Ele não existe, e não
   deve: reintroduzir `organization_id` reintroduz a complexidade que a decisão
   de instância única eliminou. Ver
   [`docs/frozen/seguranca.md`](docs/frozen/seguranca.md).
2. **O ledger é a fonte da verdade; o saldo é cache.** `inventory_item.on_hand` e
   `inventory_item.reserved` são reconstruíveis a partir de `ledger`, e a
   reconciliação diária confere os dois. **Nunca escreva no saldo por fora de uma
   operação de estoque** — toda escrita tem que ter a entrada no ledger
   correspondente, ou a reconciliação acusa.
3. **A ordem dos dois statements no `db.batch()` é load-bearing.** Toda operação
   de estoque é: (1) a entrada no `ledger`, que é onde mora a guarda; (2) o
   saldo, guardado por `EXISTS (SELECT 1 FROM ledger WHERE id = :id)`. **A guarda
   vem primeiro.** A variante com o mesmo guard nos dois statements perde a
   entrada do ledger: o segundo lê o saldo já mutado, não casa, e o lote termina
   com o cache movido e o ledger sem a linha. Foi medido no D1 local.
4. **A guarda é um trigger, e o `handleApiError` precisa traduzir
   `SQLITE_CONSTRAINT_TRIGGER`.** O `RAISE(ABORT, 'INSUFFICIENT_STOCK')` chega
   com a mensagem intacta; sem um ramo para esse código, a guarda vira
   `500 INTERNAL_ERROR` e o cliente perde o motivo. É a mesma classe do
   `CHECK constraint failed`, que o banco não tem e não deve ter.
5. **`ledger.ref_id` não é uma FK.** Aponta para `donation`, `delivery`,
   `inventory_count`, `inventory_adjustment` ou para outra linha do ledger,
   conforme o `kind` — e SQLite não tem FK polimórfica. A integridade é uma
   consulta, que é teste.
6. **O ledger é append-only.** Correção é movimento novo (`REVERSE`, `ADJUST`),
   nunca edição e nunca `DELETE`. E o conteúdo de um documento é **fixo na
   criação**: para corrigir, estorna e recria.
7. **Não crie `check()`.** O banco não tem nenhum, e o `handleApiError` só
   traduz `FOREIGN KEY` e `UNIQUE constraint`: uma escrita rejeitada por um
   `check()` volta como `500 INTERNAL_ERROR`.
8. **Não edite `src/react-app/route-tree.tsx`.** É gerado pelo
   `@tanstack/router-plugin` a partir de `src/react-app/routes/`. Para adicionar
   rota, crie o arquivo lá.
9. **A preview URL usa as bindings de produção.** Testar por ela escreve no
   `prod-sistema-doacoes-2`, que hoje só tem seed. Não é ambiente isolado.
10. **A API ainda não está pronta para produção**: não há papéis nem `403` em
    lugar nenhum, e a guarda do estoque lê o cache — que é reconciliado, mas só
    uma vez por dia. Ver [`docs/frozen/api.md`](docs/frozen/api.md).
11. O `notFound` em `src/worker/index.ts` responde `"Rota não encontrada."` em
    português, quebrando a regra de mensagem em inglês do
    [`docs/frozen/api.md`](docs/frozen/api.md). Corrigir junto, ou não mexe.
12. **No logout, use `setQueryData(key, null)` e nunca `removeQueries`.** Remover
    tira a query do cache enquanto o observador dela ainda está montado, e nenhuma
    montagem posterior volta a buscar — o `invalidateQueries` do login passa a não
    encontrar nada e vira no-op, então o sign-in não busca a sessão nova. Zerar o
    valor mantém a entrada saudável e dá o mesmo efeito na tela.
13. **As features da tabela estão em
    `components/tables/utils/table-features.ts`, e não são mais vazias.**
    Ordenação, filtro global, filtro por coluna e paginação saem de lá, junto do
    `DataTableFeatures` que é o primeiro genérico de `createColumnHelper`. Quatro
    detalhes que o TypeScript não pega: `globalFilterFn` tem que ser a **string**
    `"includesString"`, porque `"auto"` devolve o `filterFn_includesString` embutido
    da lib e desliga a variante sem acento; `autoResetPageIndex` e
    `autoResetSorting` precisam ser `false`, porque o core row model dispara os
    dois resets a cada mudança de referência de `data`; `sortUndefined: "last"` só
    compara com `undefined`, então coluna anulável precisa de accessor de função
    com `?? undefined`, senão o `null` da API entra como zero; e o clamp de página
    só roda depois que os dados chegaram, senão o total zero apaga o `?page=2` da
    URL no primeiro render.
    As armadilhas completas estão em
    [`docs/frontend-tabela.md`](docs/frontend-tabela.md).
14. **`aria-sort` é nosso.** A v9 não tem o atributo: quem escreve é o
    `TableHead`, com o `ariaSort` de `table-features.ts`. E
    `table-sortable-header.tsx` exporta **só componente**, porque
    `react-refresh/only-export-components` avisa quando um arquivo de componente
    exporta função — por isso o `ariaSort` mora no módulo das features, e não
    junto do header.
15. **Página e ordenação moram na URL, e só na rota da lista.** `page`, `pageSize`
    e `sort` são search params de `routes/_authenticated/<area>/<recurso>/index.tsx`,
    com o schema em `table-view-state.ts`, e as duas slices são controladas no
    `useTable`. A rota do registro é `<area>/<recurso>/$id.tsx` e **não** tem
    `validateSearch`: o contexto de volta viaja no `state` da navegação
    (`state: { lista: view }`), lido por `useListView()`. Ordenar escreve
    `page: 0` junto do `sort`. E como a paginação é controlada, `setPageSize`
    seguido de `setPageIndex(0)` perde a escrita — use
    `setPagination({ pageIndex: 0, pageSize })`, uma chamada só.
16. **O tipo de exibição da tabela é um `Pick`, não a linha inteira.** Ele vem do
    `<recurso>SelectSchema`, então não é escrito à mão, e o `Pick` existe para a
    tela não carregar as ~25 colunas. Para a tabela mostrar mais um campo,
    acrescente o nome na lista do `Pick` — o endpoint continua devolvendo a linha
    completa. Quem precisa da linha inteira usa o `ZodInfer` do mesmo schema, e a
    query de detalhe.
17. **`PATCH` nunca leva `id` no corpo** (`READ_ONLY_FIELD`), e `parseBody`
    checa isso *antes* do zod, então nem um `id` válido escapa. É por isso que a
    mutation de update recebe o id como **argumento separado** do payload, e que
    o estado do formulário não tem `id`. O mesmo `id` volta no corpo do `GET`,
    nunca no do `PATCH`.
18. **O formulário manda todos os campos sempre, nos dois modos.** A API aceita
    `PATCH` parcial, mas um corpo vazio é `400 EMPTY_UPDATE`, então enviar tudo
    satisfaz a regra sem lógica de dirty field. Não "melhore" isso com diff sem
    revisar esse item.
19. **Erro de mutation não aparece na tela.** Não há `Alert`, nem `toast`, nem
    `errorMap` por campo para falha de servidor: o `MutationCache` em
    `lib/query-client.ts` joga no `console` e pronto. As mensagens do zod em
    `src/schemas/zod/` estão em português e servem à validação de campo do
    formulário, mas a API responde em inglês via `errors.ts` — são públicos
    distintos, e não se traduz o mesmo texto. Ver o item 5 de
    [`docs/backlog-pi2.md`](docs/backlog-pi2.md).
20. **No `onSubmit`, a ordem é `mutateAsync` → `invalidate` → `navigate`.** Com
    `mutate` sem `await`, a invalidação dispara enquanto o `PATCH` ainda está no
    ar; o `GET` da lista corre contra ele, grava a linha velha no cache com
    `dataUpdatedAt` novo, e o `staleTime` segura os 5 segundos seguintes — a
    lista volta velha e só um F5 conserta. `mutateAsync` lança onde `mutate`
    engolia, então o `try`/`catch` é obrigatório e segura a navegação em caso de
    erro. A receita está em
    [`docs/frontend-formulario.md`](docs/frontend-formulario.md).
21. **Estado de tabela não entra no `queryKey`.** `beneficiaryKeys.all` continua
    `["beneficiaries"]`: a API devolve a tabela inteira e filtra e pagina no
    cliente, então busca, ordenação e página custam **zero** requisição. Se `page`
    ou `q` fossem para a chave, cada tecla abriria uma entrada de cache e
    dispararia um `GET` — o oposto do objetivo. Isso não impede o estado de viver
    na URL: são coisas diferentes, e o item 15 é sobre a URL.
    **A exceção é o ledger**, que é a única tabela que cresce sem limite e
    pagina no servidor.
22. **`.refine()` num schema que a API valida vaza português.** A resposta da API
    tem que ser em inglês, e ela só é porque `errorFromIssue` reconstrói a frase a
    partir de `issue.code` e ignora `issue.message` — **menos** no ramo
    `"custom"`, que é o que `.refine()` produz. Regra que atravessa dois campos
    vai no handler, com `apiError(...)` e frase em inglês.
23. **`await db.prepare(sql)` não executa nada no D1.** Uma prepared statement só
    roda com `.run()`, `.all()` ou `.raw()`, e o `await` em cima de uma delas não
    faz nada: ela só vai virar promise. Isso apareceu como um rollback que não
    desfez nada — o registro recusado continuava na tabela.
24. **`db.batch()` é transação contra erro, não contra zero linhas.** Uma
    statement que casa zero linhas não dá erro, e o lote **não** reverte. É por
    isso que a guarda do estoque mora num trigger, que aborta **com erro** — e
    reverte o lote inteiro.
25. **Filtro de tabela é do frontend, não query param.** Não há paginação nem
    filtro no servidor, de propósito: o cliente busca a tabela inteira, filtra com
    a TanStack Table e cacheia, e a mutação invalida a chave e refaz uma busca só.
    O `donation` e o `delivery` são os dois recursos que crescem sem limite no
    tempo; se algum dia `GET /deliveries` passar de alguns MB, paginação vira
    otimização — não antes.
26. **Todo id gravado é minúsculo, e a diferença ninguém vê.** `crypto.randomUUID()`
    devolve minúsculo, mas `fake(z.uuidv4())` devolve **maiúsculo** — e o `.uuid()`
    do zod aceita os dois, então o seed escrevia 100% das linhas em maiúsculas
    misturadas enquanto a API escrevia minúsculas, no mesmo banco. Não quebrava
    nada, porque id só é comparado com ele mesmo, até alguém colar um id de saída
    do seed numa chamada. Use `novoId()` em `generate.ts`, e
    `tests/inventory.ts` falha se alguma coluna `id`/`*_id` divergir de
    `lower()`. Não é preference: é padronização, e o custo de descobrir isso
    depois é uma migration de dados.
27. **Não use `.strict()` em schema que é só de formulário.** Remover o
    `.strict()` permite que o esquema aceite campos extras (que são simplesmente
    ignorados durante a validação) enquanto ainda impõe campos obrigatórios e
    tipos de dados. Isso é útil quando o formulário envia campos adicionais não
    registrados, ou quando o mesmo schema serve para validação de API e de
    formulário. **No lado da API o `.strict()` é proposital** — é ele que
    transforma campo desconhecido em `400 UNKNOWN_FIELD`.
28. **`staleTime: 5000` está comentado** em `src/react-app/lib/query-client.ts`.
    Com `staleTime: 0` e `refetchOnWindowFocus: true` — o padrão do TanStack —,
    cada refocus refaz a consulta inteira, e a consulta traz a tabela toda. É o
    maior item isolado do orçamento de leitura do D1, qualquer que seja o modelo.
29. **O contrato é `src/schemas/api/`, e ele é escrito à mão.** O `drizzle-orm/zod`
    saiu: derivar o schema da API da tabela faz a API virar um despejo do
    banco, e a lista passa a devolver a linha inteira — endereço incluído.
    **Ao criar ou mexer num recurso, o schema do contrato é o que se escreve**;
    o Drizzle segue o contrato, e não o contrário. E o `src/schemas/zod/` é
    **deprecado**: ele ainda existe porque as rotas e o frontend ainda o
    importam, e ele sai com a migração das rotas.

## Branches e commits

`main` é a única branch de longa vida. `dev` e `stage` existiram e foram
abandonadas — não criar de novo. Feature branch a partir de `main`, PR, e o merge
acontece quando o check passar e o teste manual estiver feito. Commits no formato
Conventional Commits, com o motivo no corpo quando a mudança não for óbvia.
Português, sem acento.

**Sem trailer de coautoria.** Nada de `Co-authored-by`, `Co-Authored-By`,
`Signed-off-by` ou qualquer trailer decredited, mesmo quando a mudança foi
escrita por um agente. Os 134 commits alcançáveis deste repo — toda a `main` e
todas as branches — **não têm nenhum**. Existem 4 commits órfãos, só no reflog
(sem ref apontando), com trailer de Claude: `0bb230e`, `3a5bfb9` e `4613ec7` do
redesenho de estoque, e `a93ea07` da tela de assistidos. Nenhum deles chegou à
`main`: o PR #59 foi squash-merged como `995c348`, e o squash descartou o trailer.
Não é para recomeçar.

## Ao mexer no código, atualize o doc

| Mudança | Documento |
|---|---|
| Script novo, passo de deploy | `docs/arquitetura.md` |
| Decisão técnica de modelo | `docs/arquitetura.md` |
| Work item novo ou requisito coberto | `docs/backlog-pi2.md` |
| Tela de recurso nova | `docs/frontend-*.md` |
| Mudança no contrato da API | `src/schemas/api/` **e** `docs/frozen/api.md` |
| Mudança no modelo do banco | `docs/frozen/modelos-db.md` |

O `docs/frozen/` é leitura **de contrato**, e o contrato muda por decisão
explícita — não por arrasto do código. `docs/future/` e `docs/archive/` **não**
se atualizam, e `archive/` não é referência do estado atual.

## Fora de escopo

Nada aqui é tarefa do trabalho atual. Cada item existe para você **não** mexer
nele, e o motivo está escrito para não parecer convite:

- **O `sonner` e o `<Toaster>`.** `next-themes` monta o `ThemeProvider` em
  `main.tsx` e é o que alterna a classe `dark`. O `<Toaster>` nunca foi
  montado; quem decidir usar toast monta e pronto. Não remova o pacote.
- **`src/react-app/lib/utils.ts`** só faz `export { cn } from "cn"` e ninguém
  importa. Os componentes importam `cn` do pacote direto. Apagar só no momento
  em que alguém mexer nesse arquivo.
- **O banco remoto ainda não foi recriado.** As migrations foram regeradas e o
  local foi semeado; falta aplicar no remoto. Não rode `--remote` para
  "resolver", a menos que a tarefa seja essa.
- **`docs/inventory-pattern.md`** é órfão: não está no índice do
  `docs/README.md` e ninguém referencia. Ele descreve um padrão de query que o
  código não segue. Apagar ou reescrever, quando alguém mexer no `docs/`.
- **`tsconfig.json` mantém `ignoreDeprecations: "6.0"`** porque o TypeScript 6
  reclama do uso antigo. Não remova para silenciar.

## Lint: por que existem duas exceções no `eslint.config.js`

`npm run lint` fecha em **zero warning**. As duas exceções estão no config, e não
em comentário no arquivo, porque ambos são sobrescritos por ferramenta:
`react-refresh/only-export-components` em `components/ui/**` (o shadcn exporta o
componente e o `cva` de variantes no mesmo arquivo, que é a convenção da lib, e
`npx shadcn add` apagaria um comentário por arquivo), e
`reportUnusedDisableDirectives` em `worker-configuration.d.ts`, que é gerado por
`npm run cf-typegen` e já vem com `// eslint-disable-line`.

Se aparecer warning novo, **não** desligue a regra: ajuste o código.
