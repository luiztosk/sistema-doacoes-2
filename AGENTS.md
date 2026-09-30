# AGENTS.md

Instruções para agentes de código neste repositório. O objetivo é registrar o que
**não dá para deduzir lendo o código**.

Comece por [`docs/README.md`](./docs/README.md) para saber qual documento é a
fonte da verdade de cada assunto.

## Comandos

```bash
npm run dev      # Vite dev server (não wrangler dev)
npm test         # tsx tests/api.ts — 28 casos da API
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
  nada vai te avisar se você errar. As mensagens de commit são em português, sem
  acento.
- **Identificadores em inglês.** Variáveis, funções, parâmetros, chaves de objeto e
  tipos. A exceção são os nomes de campo que vêm do schema ou da API —
  `cestaBasica`, `tipoImovel`, `valorAluguel` — que seguem exatamente como estão
  no banco, porque são o contrato com o servidor.
- **Interface visível em português do Brasil.** Títulos, rótulos de coluna, botões,
  mensagens de erro e valores de menu. Um cabeçalho de coluna é interface e vai
  em português; o `accessorKey` da mesma coluna é identificador e vai em inglês.
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
| `tests/api.ts` | Runner de teste escrito à mão |
| `src/worker/db/generate.ts` | Gerador de dados do seed (faker + zod) |
| `mock_data/*.json` | Dados de referência do gerador (cidades, catálogo) |

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

São três modos, e só dois têm botão de envio:

| Modo | `assistido` | `isEditing` | Campos | Topo | Rodapé |
|---|---|---|---|---|---|
| visualização | presente | `false` | travados | `Editar` + `Voltar para a lista` | nada |
| edição | presente | `true` | liberados | `Voltar para a lista` | `Salvar alterações` + `Cancelar` |
| criação | ausente | `true` | liberados | `Voltar para a lista` | `Cadastrar assistido` |

O `Cancelar` faz `form.reset()` e volta para `false`, porque voltar sem
descartar deixaria a tela mostrando alteração que não foi salva. O `PATCH` não
pode enviar `id` no corpo (`READ_ONLY_FIELD`, `docs/api.md`), o que empurra a
decisão para o lado do componente mesmo.

**O bloqueio vem do `EditableProvider`, não de uma prop por campo.** As
primitivas de `forms/fields.tsx` leem `editable` de um contexto, senão seriam 25
`disabled={...}` repetidos no `assistido.tsx`. O contexto tem `true` como
padrão, então uma primitiva usada fora do provider fica editável.

Na tabela, a linha inteira é clicável e navega para a mesma rota do botão
`Mais detalhes`; o botão existe para o caminho por teclado e para deixar isso
óbvio. Os dois `stopPropagation`, senão o clique dispara a navegação duas vezes.

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

**O estado do formulário é o payload.** `AssistidoFormValues` é o
`assistidoInsertSchema` com o `undefined` tirado, então `TextField` produz
`string | null`, `NumberField` produz `number | null` e `CheckboxField` produz
`boolean`. Não existe passo de conversão em `onSubmit`: quem converte é o
`onChange` da primitiva, e o objeto que o `form` entrega é o objeto que vai no
corpo. Isso é o que permite validar com `assistidoInsertSchema` direto e sem
duplicar regra.

O mesmo schema valida nos dois modos, inclusive na edição: `assistidoUpdateSchema`
torna `nome` opcional, então um `nome` vazio passaria no cliente e tomaria `400`
no servidor. `assistidoInsertSchema` é o mais estrito dos dois e vale para os
dois.

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
2. **O `check()` que existia no banco foi removido com a recriação.** O schema
   nunca teve `check()`, e a baseline antiga ainda tinha 26. As migrations
   foram regeradas do zero, então o banco atual não tem nenhum. Vale saber
   porque `handleApiError` só traduz `FOREIGN KEY` e `UNIQUE constraint`: se
   algum `check()` voltar a ser criado direto no DDL, uma escrita rejeitada por
   ele volta como `500 INTERNAL_ERROR`.
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
    [`docs/backlog-pi2.md`](./docs/backlog-pi2.md).

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
  migrations de um schema novo e semear em cima. Feito: as migrations foram
  regeradas e o banco local já foi semeado. Falta o remoto.
- `handleApiError` não trata `CHECK constraint failed` (vira `500`).

- `next-themes` monta o `ThemeProvider` em `main.tsx` e é o que alterna a classe
  `dark` no `<html>`, lendo as variáveis de `styles.css`. O `<Toaster>` do
  `sonner` continua sem ser montado; se nada usar toast, remova o `sonner` e
  deixe o `next-themes`.
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
