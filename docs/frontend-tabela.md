# Como adicionar a tabela de um recurso

> ✅ **O contrato mudou em 20/10/2026, e o frontend migrou em 21/10/2026.** Os
> schemas da tabela saíram de `src/schemas/zod/` — que era gerado da tabela, e
> saiu — e agora vivem em **`src/schemas/api/`**, escritos à mão. A linha da
> lista é o **`<recurso>ListSchema`**, e ela é **mais estreita** que o detalhe:
> não há `Pick` para escrever, o tipo da tela **é** o schema da lista. A
> resposta vem no envelope **`{ data: ... }`**, e a chave estrangeira do item é
> **`itemId`**.

`contacts/beneficiaries` é a referência de uma tabela de **contato**: ela já
está com a linha clicável, o botão de detalhe e o tipo que a tela carrega, e
é o que o build e o PR validam. `contacts/donors` aplica a mesma receita com
Nome, Cidade, Telefone, E-mail e Detalhes. O accessor auxiliar `uf` alimenta o
filtro exato por estado e não é renderizado: a sigla continua aparecendo junto
da cidade, sem uma coluna visível adicional.

## A linha leva o id, e a tela faz a junção

A lista de doação leva o `donorId` e **não** o nome do doador, e a de entrega
leva o `beneficiaryId` e não o nome do beneficiário. A tela já tem o catálogo
em cache — `donorsOptions` e `beneficiariesOptions` — e faz a junção:

```tsx
const enriched = data.map((row) => ({
	...row,
	donorName: donors.find((donor) => donor.id === row.donorId)?.name ?? row.donorId,
}));
```

O `columnHelper` é tipado com a linha enriquecida
(`DonationList & { donorName: string }`), e é o `id` que fica na coluna
quando o doador não está no cache. É a mesma decisão que vale para o filtro
das tabelas: a API não manda nome de outro recurso.

## A tabela do ledger é a exceção

O histórico de estoque é a **única** tabela que **pagina no servidor**: é a
única que cresce sem limite, porque um histórico de movimentos tem uma linha
por operação, para sempre. As outras recebem a tabela inteira e filtram no
cliente.

A tela do ledger usa o `ServerPagination`, e não o `TablePagination` — o
primeiro é dirigido pela URL (`page` e `pageSize` no search param) e pelo
`total` que a API devolve; o segundo conta as linhas do cliente.

`inventory/item` é a referência de uma tabela de **catálogo**: tem a coluna
derivada, o filtro e o `sortUndefined` numa coluna anulável. As duas são
referências de formas diferentes de coluna, e o resto da receita é igual.

`lib/queries/<area>/<recurso>.ts` é o **mesmo arquivo** que o formulário vai
completar — um recurso lê e escreve em um arquivo só. A tabela precisa dele
antes de existir, porque é daí que sai a lista.

| Arquivo | Copiar de |
|---|---|
| `lib/queries/<area>/<recurso>.ts` | `lib/queries/contacts/beneficiaries.ts` |
| `components/tables/<area>/<recurso>.tsx` | `components/tables/contacts/beneficiaries.tsx` |
| `routes/_authenticated/<area>/<recurso>/index.tsx` | `.../contacts/beneficiaries/index.tsx` |
| `lib/navigation.ts` | a entrada em `resources` |

O nome do arquivo segue o recurso e o da pasta: `tables/` para lista,
`lib/queries/` para o servidor. Sem sufixo `-table`, porque a pasta já diz.

`components/tables/utils/` tem os arquivos **genéricos**, que não são de um
recurso e não se copiam: `table-features.ts`, `table-sortable-header.tsx`,
`table-toolbar.tsx`, `table-pagination.tsx` e `table-view-state.ts`. É a mesma
separação de `components/ui/`: o que é do recurso fica no arquivo do recurso, o
que é de tabela fica num arquivo com o nome da tabela.

## Ordenação, filtro e paginação são do cliente

`GET /api/v1/{recurso}` devolve a tabela inteira e não lê nenhum query param.
Então as três capacidades nascem no cliente, sobre o array que já está no cache —
**zero requisição a mais**, e nenhuma mudança no backend, que está congelado.

A consequência que amarra tudo: **estado de tabela não entra no `queryKey`**.
`beneficiaryKeys.all` continua `["beneficiaries"]`. Se `page`, `q` ou `sort`
fossem para a chave, cada tecla e cada clique de página abriria uma entrada de
cache e dispararia uma requisição — o oposto do objetivo.

**A exceção é o ledger.** `GET /api/v1/ledger` pagina no servidor, porque é a
única tabela que cresce sem limite no tempo: um histórico de movimentos tem uma
linha por operação, para sempre. A tela do ledger é a **única** do app que não
busca a tabela inteira. As outras continuam buscando a tabela toda, e a
justificativa de por que o ledger foggiu do padrão está em
[`arquitetura.md`](arquitetura.md#o-modelo-de-estoque-virou-ledger).

## Página e ordenação moram na URL

`page`, `pageSize` e `sort` são search params de
`routes/_authenticated/<recurso>/index.tsx`, com o schema em
`table-view-state.ts`. Não é decoração: a tabela **desmonta** ao navegar para o
detalhe, e um `useTable` novo nasce do zero, então sem a URL a página morreria a
cada ida e volta. De quebra, back e forward do navegador, F5 e "copiar link"
passam a funcionar.

`sort` viaja junto com `page` porque `?page=3` sozinho quer dizer "página 3 da
ordem padrão". Se a pessoa ordenou por `Nome`, voltou de um detalhe e cai na
página 3 da ordem padrão, é o mesmo problema da ordenação, um nível acima.

A URL é a dona, então as duas slices são **controladas** no `useTable`:

```tsx
state: {
	pagination: paginationFromView(view),
	sorting: sortingFromView(view.sort),
},
onPaginationChange: (updater) => { /* escreve a URL */ },
onSortingChange: (updater) => { /* escreve a URL, com page: 0 */ },
```

`functionalUpdate` nos dois, porque callback controlado recebe valor **ou**
função do estado anterior. `state` é `Partial<TableState>`, então `globalFilter`
e `columnFilters` continuam internos e não vão para a URL — busca e filtro se
perdem ao navegar, que é o comportamento de antes.

**Ordenar volta para a página 1.** Cai de graça: o `onSortingChange` é o único
lugar que sabe que ordenar muda o conjunto de linhas, e escreve `page: 0` junto
do novo `sort`. `TableColumnFilter` e a busca fazem o mesmo chamando
`setPageIndex(0)`.

A rota do registro **não** tem `validateSearch` — e é por isso que ela é
`routes/.../<recurso>/$id.tsx`, sem o segmento `id` no meio: assim o drill-down
não precisa carregar `tableViewSchema` só para devolver a página de onde a
pessoa veio. O contexto de volta viaja no `state` da navegação
(`state: { lista: view }`), que é estado de histórico e não vai para a URL. A
rota do registro fica sem nenhum search param, e `page`/`sort` só aparecem na URL
da lista.

Duas consequências honestas desse desenho:

- `viewForUrl` remove o que é o padrão, então `/contacts/beneficiaries` sem
  param é a visão padrão e `?page=2` é a terceira página. O param é **índice**,
  não número.
- Cada escrita usa `replace: true`, porque página e ordenação são estado de
  visualização e não navegação. Back do navegador volta da tela de registro para
  a página de onde saiu, mas não "desfaz" um clique de página.

Um efeito corrige `?page=99` — e `page=3` depois de um filtro que estreitou o
resultado — voltando para a primeira página. Ele só pode rodar **depois** que os
dados chegaram: antes disso o total é zero, toda página parece fora do alcance,
e o `?page=2` da URL é apagado no primeiro render. Ver a armadilha 6.

## Reutilizar, não reescrever

- `beneficiariesOptions` e o tipo `BeneficiaryTableView` de
  `lib/queries/contacts/beneficiaries.ts`. O tipo é um `Pick` de propósito, para
  a tela não carregar as ~25 colunas: para mostrar mais um campo, acrescente o
  nome na lista do `Pick`.
- `features` e `DataTableFeatures` de `utils/table-features.ts`. Coluna de
  display não é feature, então nenhuma coluna nova exige mexer nisso.
- `SortableHeader`, `TableToolbar`, `TableColumnFilter`, `TablePagination`,
  `tableViewSchema`, `paginationFromView`, `sortingFromView`, `sortingToView`,
  `viewForUrl` e `useListView`. Todos genéricos: só a coluna, o rótulo, as
  opções e a rota mudam por recurso.
- `cn`, `Table*` e `buttonVariants` de `components/ui/`.



## Pontos que precisam espelhar

- `accessorKey` em inglês, `header` em português, na mesma coluna. O `accessorKey`
  é identificador e o `header` é interface. Com `SortableHeader` o rótulo vai
  por prop, e é o rótulo que é português.
- Linha inteira clicável e botão **Mais detalhes** para o mesmo destino, com
  `stopPropagation` no botão: sem isso o clique sobe para o `<tr>` e dispara a
  navegação duas vezes.
- Os dois mandam a mesma visão em `state.lista`, e ela vem da prop `view`, nunca
  de `useListView()`: dentro da lista esse hook lê o `state` da rota da lista,
  que é `{}` porque nenhuma navegação para a rota da lista passa `state`.
  `useListView()` é o hook do **formulário**, que roda na rota do registro.
- Os dois chegam na visão por caminhos diferentes, e é por isso que um closure
  não basta para os dois. `abrir`/`openDonor` são definidos no corpo do
  componente, então fecham sobre a prop `view` e não precisam de nada. O `cell`
  do botão é de escopo de módulo e só recebe `row`, então a visão chega por um
  `ListViewContext` criado no arquivo da tabela.
- O botão é um `<Link>` com `className={buttonVariants(...)}`, e **não**
  `<Button nativeButton={false} render={<Link/>}>`: o Base UI põe
  `role="button"` em todo elemento não nativo, e um `<a role="button">` perde
  a semântica de link justamente da parte que serve para ctrl/click e abrir em
  nova aba. `Button` fica para `Editar` e para os submits.
- `getRowId: (row) => row.id`.
- Nulo vira `—` (`empty = "—"`), booleano vira `Sim`/`Não`, dinheiro vira
  `R$ ${valor.toFixed(2)}`.
- Linha de cidade/UF é uma coluna de display, não um accessor: a chave é
  `id: "cityLabel"` porque não é uma coluna do banco.
- **Estado vazio é obrigatório.** Filtro sem resultado e página fora do alcance
  renderizam `<TableCell colSpan={columns.length}>`, senão a tabela fica um
  `<tbody>` vazio sem explicação.

## Seis armadilhas que só aparecem em execução

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
   `TableColumnFilter` chamam `setPageIndex(0)` junto do filtro.
5. **`sortUndefined: "last"` só olha `undefined`, nunca `null`.** O teste é
   `aValue === void 0`, e a API devolve `null` para coluna anulável — então a
   flag nunca dispara e o nulo entra como zero, no topo da ordem crescente. A
   correção é o accessor de função, com `?? undefined`:
   `accessor((row) => row.renda ?? undefined, { id: "renda", sortUndefined: "last" })`.
   Vale para toda coluna anulável que é ordenável, não só para `renda`.
6. **O clamp de página não pode rodar antes dos dados.** Com `isPending`, o total
   é zero e qualquer `page` parece fora do alcance, então `?page=2` é apagado no
   primeiro render. Carga direta em `?page=2` abria na página 1.

Uma que não é da biblioteca, e sim do fato de a ordenação padrão ser `nome.asc`:
**renomear um registro o move.** Salvar com o nome trocado muda a chave de
ordenação, então a linha pode sair da página em que a pessoa está — o mesmo
limite do registro recém-criado, que pode não cair na página 1 porque a rota de
lista não tem `ORDER BY`. Nenhuma das duas é defeito; são consequências de
ordenar no cliente, e vale saber antes de prometer "a linha que você editou está
ali".

`aria-sort` não existe no TanStack Table v9: quem escreve é o `TableHead` do
cabeçalho, com o `ariaSort` de `table-features.ts`. E `table-sortable-header.tsx`
exporta **só componente**, porque `react-refresh/only-export-components` avisa
quando um arquivo de componente exporta função — por isso o `ariaSort` mora em
`table-features.ts`.

E uma de controlled state: **não chame `setPageSize` e `setPageIndex` em
sequência.** Com paginação controlada as duas chamadas disparam
`onPaginationChange` com o mesmo estado anterior, e a segunda sobrescreve a
primeira — o `pageSize` novo se perde. `TablePagination` faz
`table.setPagination({ pageIndex: 0, pageSize })`, que é uma escrita só.


## O que vem depois

| Recurso | Situação |
|---|---|
| `beneficiary`, `donor` | **Implementados** (`main` e branch), 3 modos, em `tables/contacts/`. |
| `inventory/item`, `inventory/category` | **Implementados** na branch, em `tables/inventory/`. |
| `inventory/donations`, `inventory/delivery` | **Implementados** na branch, em `tables/inventory/`. Verbo próprio, não CRUD — ver `frozen/api.md`. |
| `stock`, `ledger` | **Implementados** na branch, em `tables/inventory/`. A tela do saldo (`GET /api/v1/stock`) e a do histórico (`GET /api/v1/ledger`, com paginação no servidor). |

**Não construa tela para `coleta`, `entrega` nem `item`:** eles saíram do banco
no redesenho do estoque, e os recursos que os substituiram já têm tela —
`donation`, `delivery` e `inventory/item`. Do mesmo jeito, **não construa tela
para `donation_line` nem `delivery_line`:** o conteúdo de um documento se lê no
ledger filtrando por `ref_id`, e a linha do documento é `{ itemId, quantity }`.

O desenho do modelo anterior está em [`future/README.md`](future/README.md) e o
novo, em [`frozen/modelos-db.md`](frozen/modelos-db.md).

`inventory/item` é a **única** tabela de catálogo: a deduplicação de nome do
`item-category` foi fundida em `inventory_item.name`, e `inventory/category` é o
catálogo remanescente.

## Fora de escopo

- **Não mexa em `src/worker/`.** Esquema, rotas e migrations estão congelados
  nesta rodada. Se a tela precisa de um campo que não existe, pare e pergunte.
  Ordenação, filtro e paginação são justamente o caso em que a resposta é "no
  cliente", e não "crie o endpoint".
- **Não crie a linha inteira como `<a>`, e não "conserte" o desenho depois.**
  Motivo duplo: `<a>` não envolve `<td>`, o parser de HTML tira o elemento para
  fora da tabela, então a linha não pode ser âncora; e o link interno é o que dá
  o caminho de teclado e leitor de tela. A linha fica em `onClick` com
  `useNavigate`, como está. Vale saber que abrir em nova aba **perde a visão** em
  qualquer das duas formas: `state.lista` é estado de sessão da aba, e a aba nova
  não o recebe.
- Não crie teste automatizado de tela. O runner é de API e não cobre React.
- Não mova `components/tables/` para perto do recurso: agrupamento é por tipo
  e, dentro do tipo, por área.
- Não use o componente `Pagination` do shadcn aqui. Ele renderiza `<a href>`, o
  que só faz sentido com estado de página na URL. O guia de data table do
  shadcn para Base UI monta o paginador com `Button` e `Select`, que é o que
  `TablePagination` faz.
- **Não ponha `tableViewSchema` na rota do registro.** É tentador, para devolver
  a página de onde a pessoa veio, mas aí dois assuntos sem relação dividem o
  mesmo `validateSearch` e a URL do registro passa a descrever uma lista que não
  está na tela. O contexto de volta vai no `state` da navegação.

Depois de criar a tabela, siga
[`frontend-formulario.md`](frontend-formulario.md) para a tela de detalhe.

