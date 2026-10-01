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

## Reutilizar, não reescrever

- `assistidoOptions` e o tipo `Assistido` de `lib/api/assistidos.ts`. `Assistido`
  é um `Pick` de propósito, para a tela não carregar as ~25 colunas: para
  mostrar mais um campo, acrescente o nome na lista do `Pick`.
- `tableFeatures({})` **fica vazio**. Coluna de display não é feature, então
  nenhuma coluna nova exige mudar isso.
- `cn`, `Table*` e `buttonVariants` de `components/ui/`.

## Pontos que precisam espelhar

- `accessorKey` em inglês, `header` em português, na mesma coluna. O `accessorKey`
  é identificador e o `header` é interface.
- Linha inteira clicável e botão **Mais detalhes** para o mesmo destino, com
  `stopPropagation` nos dois: sem isso o clique dispara a navegação duas vezes.
- `data ?? []` e `getRowId: (row) => row.id`.
- Nulo vira `—` (`empty = "—"`), booleano vira `Sim`/`Não`, dinheiro vira
  `R$ ${valor.toFixed(2)}`.
- Linha de cidade/UF é uma coluna de display, não um accessor: a chave é
  `id: "cityLabel"` porque não é uma coluna do banco.

## O que vem depois

| Recurso | Situação |
|---|---|
| `doador` | **Liberado.** É o `assistido` sem a parte social: só texto e o enum `uf`. Serve de primeiro teste da receita. |
| `donation`, `delivery`, `inventory-item`, `item-category` | **Implementados** em 01/10/2026. O estoque tem verbo próprio, não CRUD — ver [`frozen/api.md`](frozen/api.md). |

**Não construa tela para `coleta`, `entrega` ou `item`: saíram do banco.** O modelo de estoque já
foi decidido — `inventory_item` com dois contadores e uma coluna gerada, `donation`
com `donation_line`, `delivery` com `delivery_line` como reserva, e ajuste
registrado. Tela feita contra `coleta`/`entrega`/`item` morre no rename, porque os
nomes novos são em inglês. O desenho inteiro está em
[`future/README.md`](future/README.md).

`item-category` e `inventory-item` **ganham tela** — o contrário do que este
documento dizia antes: o catálogo precisa ser aditivo, porque quem registra uma
doação pode trazer um item que não está nele. É a única exceção ao congelamento
do backend, e ainda não foi implementada, então perguntar antes de fazer.

## Sem exemplo ainda

Ordenação e filtro. `tableFeatures({})` é vazio de propósito; quando entrar
isso vira algo como
`tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel(), sortFns })`
e nada mais abaixo muda — o `columnHelper`, as colunas e o `useTable` continuam
iguais. Vale citar os nomes das features para o TypeScript passar a conhecer
`sorting` e `columnFilters`.

## Fora de escopo

- **Não mexa em `src/worker/`.** Esquema, `registerResources` e migrations estão
  congelados nesta rodada. Se a tela precisa de um campo que não existe, pare e
  pergunte.
- Não adicione ordenação, filtro, paginação, coluna de ação, botão de excluir
  nem menu por linha. Nada disso foi pedido.
- Não crie a linha inteira como `<a>`. Use `onClick` com `useNavigate`, para o
  teclado continuar funcionando com o botão.
- Não crie teste automatizado de tela. O runner é de API e não cobre React.
- Não mova `components/tables/` para perto do recurso: agrupamento é por tipo.

Depois de criar a tabela, siga
[`frontend-formulario.md`](frontend-formulario.md) para a tela de detalhe.
