# AGENTS.md

Instruções para agentes de código neste repositório. O objetivo é registrar o que
**não dá para deduzir lendo o código**.

Comece por [`docs/README.md`](docs/README.md) para saber qual documento é a
fonte da verdade de cada assunto.

## Comandos

```bash
npm run dev      # Vite dev server (não wrangler dev)
npm test         # tsx tests/api.ts — 28 casos da API
npm run lint     # eslint .
npm run build    # lint + test + tsc -b + vite build
npm run check    # build + wrangler deploy --dry-run
```

O `build` é o que o **Cloudflare Builds executa a cada push**, em `&&`, então um
erro de lint ou um teste vermelho **impedem o deploy** e a `main` exige que o
check passe. Não remova o lint nem o teste da cadeia para destravar um merge.

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
  modelo de estoque são `KG`, `L`, `UNIT`, `PACK`, `BOX`, `DRAFT`, `RECEIVED`,
  `OPEN`, `COMPLETED`, `CANCELLED`, `STOCKTAKE`, `DONOR_RETURN`, `LOSS`, `DAMAGE`
  e `CORRECTION` — é o que vai no banco e no contrato da API. **Exibi-lo cru está
  errado**: `PACK` e `OPEN` são inglês, e a interface é português. A tela carrega um
  mapa de rótulo e mostra "Pacote" e "Em aberto".
  Isso vale ao contrário do que a tela de `assistido` faz, e o motivo é que ali o
  valor **é** a interface: `uf` é "SP" e `tipoImovel` é "ALUGADO", que em português
  já são o que o usuário lê. `cityLabel` mostra `cidade / uf` cru e está certo. Enum
  com valor em português dispensa mapa; enum com valor em inglês exige um, e é um
  arquivo só, no `react-app`, porque é onde a tradução vive.
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
| `src/react-app/routes/` | Arquivo = rota. É o TanStack Router que gera o `route-tree.tsx` |
| `src/react-app/lib/api/` | Um arquivo por recurso, mais `session.ts`. `queryOptions` e `mutationOptions` |
| `src/react-app/components/ui/` | **Gerado** pelo shadcn. Não editar à mão |
| `src/react-app/components/` | Agrupado por **tipo**: `ui/`, `layout/`, `auth/`, `tables/`, `forms/` |
| `src/worker/db/generate.ts` | Gerador de dados do seed (faker + zod) |

### Frontend: onde um arquivo novo vai

Agrupamento é por **tipo**, nunca por recurso: a tabela de assistidos fica em
`components/tables/assistidos.tsx` e o formulário em
`components/forms/assistido.tsx`. O arquivo se chama só `<recurso>.tsx`,
porque a pasta já diz o tipo — sufixo `-table` ou `-form` no nome seria repetir
a pasta. `components/auth/` é a exceção: é a superfície do Better Auth, não um
tipo.

Plural onde é lista, singular onde é registro: `tables/assistidos.tsx` e
`lib/api/assistidos.ts` listam, `forms/assistido.tsx` age sobre um.

**Um formulário por recurso, para criar, ver e editar.** Não existe
`create-assistido.tsx`, `view-assistido.tsx` nem `edit-assistido.tsx`: o
componente recebe o registro por prop opcional e é a rota que decide o modo —
`assistido` ausente é criação, presente é visualização. O terceiro modo é estado
interno (`isEditing`), não prop nem rota, porque "ver" e "editar" são a mesma
tela.

As duas receitas que espelham isso estão em
[`docs/frontend-tabela.md`](docs/frontend-tabela.md) e
[`docs/frontend-formulario.md`](docs/frontend-formulario.md).

São três modos, e só dois têm botão de envio:

| Modo | `assistido` | `isEditing` | Campos | Topo | Rodapé |
|---|---|---|---|---|---|
| visualização | presente | `false` | travados | `Editar` + `Voltar para a lista` | nada |
| edição | presente | `true` | liberados | `Voltar para a lista` | `Salvar alterações` + `Cancelar` |
| criação | ausente | `true` | liberados | `Voltar para a lista` | `Cadastrar assistido` |

O `Cancelar` faz `form.reset()` e volta para `false`, porque voltar sem
descartar deixaria a tela mostrando alteração que não foi salva.

**O bloqueio vem do `EditableProvider`, não de uma prop por campo.** As
primitivas de `forms/fields.tsx` leem `editable` de um contexto, senão seriam 25
`disabled={...}` repetidos no `assistido.tsx`. O contexto tem `true` como
padrão, então uma primitiva usada fora do provider fica editável.

O **nome do símbolo** continua descrevendo o que a coisa é: o arquivo é
`tables/assistidos.tsx` e exporta `AssistidosTable`. Caminho diz onde mora,
símbolo diz o que é, e os dois são eixos separados — como o `accessorKey` em
inglês e o `header` em português da mesma coluna.

Nome de arquivo em **kebab-case** (`sign-up-form.tsx`), e não PascalCase. Os dois
formulários de auth já foram renomeados porque eram os únicos em PascalCase.

Toda chamada ao servidor fica em `lib/api/<recurso>.ts` e só lá. O sufixo
`-queries` e o `-mutations` não existem: a pasta já diz, e um recurso que lê e
escreve fica em **um** arquivo só. A pasta existe para separar a camada de
servidor de `lib/` — que guarda o que não fala com o servidor, como
`auth-client.ts`, `query-client.ts` e `navigation.ts`.

Os símbolos seguem o nome do [guia de
`queryOptions`](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)
do TanStack: `<entidade>Options` para ler, `<verbo><Entidade>Options` para
escrever. Então `assistidoOptions`, `assistidoDetailOptions(id)`,
`createAssistidoOptions` e `updateAssistidoOptions(id)` — e não
`assistidosQueryOptions`. As chaves de query saem de uma factory por recurso
(`assistidoKeys`), no spirit do
[Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys),
para o `invalidateQueries` ter um alvo nomeado em vez de um array solto.

**O estado do formulário é o payload** — `AssistidoFormValues` é o
`assistidoInsertSchema` sem o `undefined`, e quem converte é o `onChange` da
primitiva, não o `onSubmit`. Por isso dá para validar com o `*InsertSchema`
direto, nos dois modos: o de update torna `nome` opcional e o de insert é o mais
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

### Exceção: `feat/redesenho-estoque` lifts o congelamento

A branch do redesenho do estoque tem **autorização para qualquer mudança
quebrante que a gente achar necessária** — sem perguntar e sem tratar
`docs/frozen/` como limite. Isso vale enquanto o redesenho estiver em andamento
nessa branch, e na `main` o congelamento acima continua valendo.

O que isso libera: renomear tabela e coluna, derrubar `coleta`, `entrega` e
`item`, trocar endpoint e rota, reescrever o gerador do seed, reescrever os 28
casos de [`tests/api.ts`](tests/api.ts) e a tela de `assistido` que já está
mergeada.

O que o congelamento **não** segurava, e que continua de pé, porque não é sobre
o modelo: todas as regras de [`docs/frozen/seguranca.md`](docs/frozen/seguranca.md)
— em particular `organization_id` fixo continua proibido e `check()` continua sem
criação. E o contrato de [`docs/frozen/api.md`](docs/frozen/api.md) continua
valendo no que é segurança e forma do erro: `401` sem corpo, no máximo um erro
por requisição, e mensagem em inglês.

**A única exceção** ao congelamento, fora daquela branch, é registrar
`nome-itens` e `categoria-itens` em `registerResources`, porque o catálogo precisa
ser aditivo para quem registra uma doação trazer um item que não está nele.

**O modelo de estoque foi implementado** em 01/10/2026: `inventory_item`,
`donation`, `delivery`, e as tabelas de reserva, contagem e ajuste. `coleta`,
`entrega`, `item`, `nome_item` e `categoria_item` **foram removidas do banco** —
não ganham tela porque não existem mais. `item` **não vira `inventory_item` por
rename**: eram coisas diferentes, e é por isso que a deduplicação de nome foi
fundida em `inventory_item.name` em vez de sobreviver numa tabela de catálogo.
`doador` está liberado, e é o `assistido` sem a parte social.

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

## Coisas que vão te morder

1. **`organization_id` não existe** nas tabelas de domínio, e a API não filtra
   por organização. O plugin `organization()` do Better Auth **está ativo** em
   `auth.ts` e as tabelas de organização existem — essa é a isca mais fácil do
   repo. **Não introduza um valor fixo para "simular" o filtro**: viola a regra 1
   de [`docs/frozen/seguranca.md`](docs/frozen/seguranca.md) e é explicitamente
   proibido em [`docs/frozen/api.md`](docs/frozen/api.md). Volta com a
   [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13).
2. **Não crie `check()`.** O banco não tem nenhum, e `handleApiError` só traduz
   `FOREIGN KEY` e `UNIQUE constraint`: uma escrita rejeitada por um `check()`
   volta como `500 INTERNAL_ERROR`.
3. **Não edite `src/react-app/route-tree.tsx`.** É gerado pelo
   `@tanstack/router-plugin` a partir de `src/react-app/routes/`. Para adicionar
   rota, crie o arquivo lá.
4. **A preview URL usa as bindings de produção.** Testar por ela escreve no
   `prod-sistema-doacoes-2`, que hoje só tem seed. Não é ambiente isolado.
5. **A API não está pronta para produção** e não deve receber dados reais: falta
   isolamento por tenant e não há `403` em lugar nenhum. Ver
   [`docs/frozen/api.md`](docs/frozen/api.md).
6. O `notFound` em `src/worker/index.ts` responde `"Rota não encontrada."` em
   português, quebrando a regra de mensagem em inglês do
   [`docs/frozen/api.md`](docs/frozen/api.md). Corrigir junto, ou não mexe.
7. **No logout, use `setQueryData(key, null)` e nunca `removeQueries`.** Remover
   tira a query do cache enquanto o observador dela ainda está montado, e nenhuma
   montagem posterior volta a buscar — o `invalidateQueries` do login passa a não
   encontrar nada e vira no-op, então o sign-in não busca a sessão nova. Zerar o
   valor mantém a entrada saudável e dá o mesmo efeito na tela.
8. **`tableFeatures({})` em `components/tables/assistidos.tsx` é vazio de
   propósito**, porque a tabela só lê. Na primeira vez que entrar ordenação ou
   filtro, vira algo como
   `tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel(), sortFns })`
   e nada mais abaixo muda: o `columnHelper`, as colunas e o `useTable`
   continuam iguais. Vale citar os nomes das features para o TypeScript passar a
   conhecer `sorting` e `columnFilters`.
9. **O tipo `Assistido` em `lib/api/assistidos.ts` é um `Pick`, não a linha
   inteira.** Ele vem do `assistidoSelectSchema`, então não é escrito à mão, e o
   `Pick` existe para a tela não carregar as ~25 colunas. Para a tabela mostrar
   mais um campo, acrescente o nome na lista do `Pick` — o endpoint continua
   devolvendo a linha completa. Quem precisa da linha inteira usa o
   `AssistidoCompleto`, que é o `ZodInfer` do mesmo schema, e a query
   `assistidoDetailOptions(id)`: o `Pick` não serve para o formulário porque
   faltam `logradouro`, `observacoes` e os 7 booleanos.
10. **`PATCH` nunca leva `id` no corpo** (`READ_ONLY_FIELD`), e `parseBody`
    checa isso *antes* do zod, então nem um `id` válido escapa. É por isso que
    `updateAssistidoOptions` recebe o id como **argumento separado** do payload,
    e que o estado do formulário não tem `id`. O mesmo `id` volta no corpo do
    `GET`, nunca no do `PATCH`.
11. **O formulário manda os 25 campos sempre, nos dois modos.** A API aceita
    `PATCH` parcial, mas um corpo vazio é `400 EMPTY_UPDATE`, então enviar tudo
    satisfaz a regra sem lógica de dirty field. Não "melhore" isso com diff sem
    revisar esse item.
12. **Erro de mutation não aparece na tela.** Não há `Alert`, nem `toast`, nem
    `errorMap` por campo para falha de servidor: o `MutationCache` em
    `lib/query-client.ts` joga no `console` e pronto. As mensagens do zod em
    `schema.ts` estão em português e servem à validação de campo do formulário,
    mas a API responde em inglês via `errors.ts` — são públicos distintos, e não
    se traduz o mesmo texto. Ver o item 5 de
    [`docs/backlog-pi2.md`](docs/backlog-pi2.md).
13. **`.refine()` num schema que a API valida vaza português.** A resposta da API
    tem que ser em inglês, e ela só é porque `errorFromIssue` reconstrói a frase a
    partir de `issue.code` e ignora `issue.message` — **menos** no ramo
    `"custom"`, que é o que `.refine()` produz. Regra que atravessa dois campos
    vai no handler, com `apiError(...)` e frase em inglês.
14. **`await db.prepare(sql)` não executa nada no D1.** Uma prepared statement só
    roda com `.run()`, `.all()` ou `.raw()`, e o `await` em cima de uma delas não
    faz nada: ela só vai virar promise. Isso apareceu como um rollback que não
    desfez nada — o registro recusado continuava na tabela. No `stock.ts`, as
    compensações que precisam ser transacionais usam `db.batch()`, e as de uma
    linha só, `.run()`.
15. **`db.batch()` é transação contra erro, não contra zero linhas.** A guarda da
    reserva não dá erro, ela só não casa. Por isso toda operação guardada é
    "escreve, confere, compensa", e a compensação tem que **desfazer o contador**,
    não só apagar a linha: apagar é idempotente, mas o `reserved_quantity` que
    subiu continua lá e vira drift. É a armadilha que a invariante do
    [`tests/inventory.ts`](tests/inventory.ts) pegou.
16. **`registerResource` não serve para quem nasce com linhas.** `donation` e
    `delivery` são criados com as linhas no mesmo batch, então eles passam
    `create: false` e registram o `POST` à mão em `stock.ts`. A fábrica
    genérica ficou em [`src/worker/api/resource.ts`](src/worker/api/resource.ts),
    e `v1.ts` só compõe. O `GET/:id` dos dois usa o gancho `detail`, que anexa as
    linhas no mesmo formato que o `POST` aceita — **só no detalhe**: a lista não
    leva linhas, e é assim que a lista de entrega continua sendo uma linha da
    tabela e não um documento.
17. **Filtro de tabela é do frontend, não query param.** Não há paginação nem
    filtro no servidor, de propósito: o cliente busca a tabela inteira, filtra com
    a TanStack Table e cacheia, e a mutação invalida a chave e refaz uma busca só.
    O `donation` e o `delivery` são os dois recursos que crescem sem limite no
    tempo; se algum dia `GET /deliveries` passar de alguns MB, paginação vira
    otimização — não antes.
17. **Todo id gravado é minúsculo, e a diferença ninguém vê.** `crypto.randomUUID()`
    devolve minúsculo, mas `fake(z.uuidv4())` devolve **maiúsculo** — e o `.uuid()`
    do zod aceita os dois, então o seed escrevia 100% das linhas em maiúsculas
    misturadas enquanto a API escrevia minúsculas, no mesmo banco. Não quebrava
    nada, porque id só é comparado com ele mesmo, até alguém colar um id de saída
    do seed numa chamada. Use `novoId()` em `generate.ts`, e
    `tests/inventory.ts` falha se alguma coluna `id`/`*_id` divergir de
    `lower()`. Não é preference: é padronização, e o custo de descobrir isso
    depois é uma migration de dados.

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
| Work item novo ou requisito coberto | `docs/backlog-pi2.md` |
| Tela de recurso nova | `docs/frontend-*.md` |

`docs/frozen/`, `docs/future/` e `docs/archive/` estão fora desta tabela de
propósito: **não** atualize nenhum dos três, e não use `archive/` como
referência do estado atual.

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
- **`handleApiError` não trata `CHECK constraint failed`** (vira `500`) — está
  em [`docs/future/`](docs/future/README.md).
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
