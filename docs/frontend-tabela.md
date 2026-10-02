# Como adicionar a tabela de um recurso

`assistidos` é a referência: ela já está com a linha clicável, o botão de
detalhe e o `Pick` que a tela carrega, e é o que o build e o PR validam.

`lib/api/<recurso>.ts` é o **mesmo arquivo** que o formulário vai completar —
um recurso lê e escreve em um arquivo só. A tabela precisa dele antes de
existir, porque é daí que sai a lista.

| Arquivo | Copiar de |
|---|---|
| `lib/api/<recurso>.ts` | `lib/api/assistidos.ts` |
| `components/tables/<recurso>.tsx` | `components/tables/assistidos.tsx` |
| `routes/_authenticated/<recurso>/index.tsx` | `.../assistidos/index.tsx` |
| `lib/navigation.ts` | a entrada em `resources` |

O nome do arquivo segue o recurso e o da pasta: `tables/` para lista,
`lib/api/` para o servidor. Sem sufixo `-table`, porque a pasta já diz.

`components/tables/` também tem os arquivos **genéricos**, que não são de um
recurso e não se copiam: `table-features.ts`, `table-sortable-header.tsx`,
`table-toolbar.tsx` e `table-pagination.tsx`. É a mesma separação de
`components/ui/`: o que é do recurso fica no arquivo do recurso, o que é de
tabela fica num arquivo com o nome da tabela.

## Ordenação, filtro e paginação são do cliente

`GET /api/v1/{recurso}` devolve a tabela inteira e não lê nenhum query param
(`src/worker/api/v1.ts:83-86`). Então as três capacidades nascem no cliente, sobre
o array que já está no cache — **zero requisição a mais**, e nenhuma mudança no
backend, que está congelado.

A consequência que amarra tudo: **estado de tabela não entra no `queryKey`**.
`assistidoKeys.all` continua `["assistidos"]`. Se `page`, `q` ou `sort` fossem
para a chave, cada tecla e cada clique de página abriria uma entrada de cache e
dispararia uma requisição — o oposto do objetivo.

Para virar a decisão: paginação no servidor só compensa se `donation` e
`delivery` — os dois recursos que crescem sem limite no tempo — passarem de
alguns MB por resposta. Aí são duas queries por página (a página e a contagem),
e vale o custo de mexer no contrato.

## Reutilizar, não reescrever

- `assistidoOptions` e o tipo `Assistido` de `lib/api/assistidos.ts`. `Assistido`
  é um `Pick` de propósito, para a tela não carregar as ~25 colunas: para
  mostrar mais um campo, acrescente o nome na lista do `Pick`.
- `features` e `DataTableFeatures` de `table-features.ts`. Columna de display
  não é feature, então nenhuma coluna nova exige mexer nisso.
- `SortableHeader`, `TableToolbar`, `TableColumnFilter` e `TablePagination`. Todos
  genéricos: só a coluna, o rótulo e as opções mudam por recurso.
- `cn`, `Table*` e `buttonVariants` de `components/ui/`.


## Pontos que precisam espelhar

- `accessorKey` em inglês, `header` em português, na mesma coluna. O `accessorKey`
  é identificador e o `header` é interface. Com `SortableHeader` o rótulo vai
  por prop, e é o rótulo que é português.
- Linha inteira clicável e botão **Mais detalhes** para o mesmo destino, com
  `stopPropagation` nos dois: sem isso o clique dispara a navegação duas vezes.
- `getRowId: (row) => row.id`.
- Nulo vira `—` (`empty = "—"`), booleano vira `Sim`/`Não`, dinheiro vira
  `R$ ${valor.toFixed(2)}`.
- Linha de cidade/UF é uma coluna de display, não um accessor: a chave é
  `id: "cityLabel"` porque não é uma coluna do banco.
- **Estado vazio é obrigatório.** Filtro sem resultado e página fora do alcance
  renderizam `<TableCell colSpan={columns.length}>`, senão a tabela fica um
  `<tbody>` vazio sem explicação.

## Quatro armadilhas que só aparecem em execução

Nenhuma delas quebra o `tsc`, e nenhuma aparece na API.

1. **`globalFilterFn: "includesString"`, nunca `"auto"`.** `"auto"` devolve o
   `filterFn_includesString` embutido da biblioteca, direto, sem passar pelo
   registro `filterFns` — então a variante sem acento fica de fora e a busca
   volta a ser sensível a acento. `"auto"` resolve pelo registro para coluna;
   para a busca global, só o nome da chave funciona.
2. **`data ?? emptyRows`, com `emptyRows` no módulo.** Um `[]` criado no
   render invalida os row models a cada passada.
3. **`autoResetPageIndex: false` e `autoResetSorting: false`.** O core row model
   dispara os dois resets sempre que a referência de `data` muda, e é o que
   acontece depois de um refetch. Sem as duas flags, salvar um registro joga o
   usuário de volta para a primeira página e derruba a ordenação.
4. **Zerar a página quando o filtro muda.** `createPaginatedRowModel` faz
   `slice` sem antes: na página 3, um filtro que sobra em 4 linhas mostra uma
   tabela vazia com resultados existentes. Por isso `TableToolbar` e
   `TableColumnFilter` chamam `setPageIndex(0)` junto do filtro, e a paginação
   faz o mesmo no `setPageSize`.

E um que é da arquitetura, não da biblioteca: **`AssistidosTable` desmonta ao
navegar para o detalhe, e um `useTable` novo nasce com `initialState`.** Página,
ordenação e busca não sobrevivem a um ida e volta pela tela de detalhe — nem
deveriam por acidente, porque nada as guarda. Para preservá-las entre uma
listagem e o detalhe, o estado da visualização precisa morar na URL, em search
params da rota. Ainda não foi feito.

`aria-sort` não existe no TanStack Table v9: quem escreve é o `TableHead` do
cabeçalho, com o `ariaSort` de `table-features.ts`. E `table-sortable-header.tsx`
exporta **só componente**, porque `react-refresh/only-export-components` avisa
quando um arquivo de componente exporta função — por isso o `ariaSort` mora em
`table-features.ts`.


## O que vem depois

| Recurso | Situação |
|---|---|
| `doador` | **Liberado.** É o `assistido` sem a parte social: só texto e o enum `uf`. Serve de primeiro teste da receita. |
| `coleta`, `entrega`, `item` | **Modelo decidido, não implementado.** Viram `donation`, `delivery` e `inventory_item`. |

**Não construa tela para `coleta`, `entrega` ou `item`.** O modelo de estoque já
foi decidido — `inventory_item` com dois contadores e uma coluna gerada, `donation`
com `donation_line`, `delivery` com `delivery_line` como reserva, e ajuste
registrado. Tela feita contra `coleta`/`entrega`/`item` morre no rename, porque os
nomes novos são em inglês. O desenho inteiro está em
[`future/README.md`](future/README.md).

`nome_item` e `categoria_item` **passam a ganhar tela** — o contrário do que este
documento dizia antes: o catálogo precisa ser aditivo, porque quem registra uma
doação pode trazer um item que não está nele. É a única exceção ao congelamento
do backend, e ainda não foi implementada, então perguntar antes de fazer.

## Fora de escopo

- **Não mexa em `src/worker/`.** Esquema, `registerResources` e migrations estão
  congelados nesta rodada. Se a tela precisa de um campo que não existe, pare e
  pergunte. Ordenação, filtro e paginação são justamente o caso em que a
  resposta é "no cliente", e não "crie o endpoint".
- Não crie a linha inteira como `<a>`. Use `onClick` com `useNavigate`, para o
  teclado continuar funcionando com o botão.
- Não crie teste automatizado de tela. O runner é de API e não cobre React.
- Não mova `components/tables/` para perto do recurso: agrupamento é por tipo.
- Não use o componente `Pagination` do shadcn aqui. Ele renderiza `<a href>`, o
  que só faz sentido com estado de página na URL. O guia de data table do
  shadcn para Base UI monta o paginador com `Button` e `Select`, que é o que
  `TablePagination` faz.

Depois de criar a tabela, siga
[`frontend-formulario.md`](frontend-formulario.md) para a tela de detalhe.

