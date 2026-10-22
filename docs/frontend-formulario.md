# Como adicionar o formulário de um recurso

> ✅ **O contrato mudou em 20/10/2026, e o frontend migrou em 21/10/2026.** O
> schema do formulário **saiu de `src/schemas/zod/`** — que era gerado da
> tabela, e saiu — e agora vive em **`src/schemas/api/`**, escrito à mão e
> com nome de contrato:
>
> | Antes | Agora |
> |---|---|
> | `src/schemas/zod/<área>` | `@/schemas/api/<recurso>` |
> | `<tabela>InsertSchema` | `<recurso>CreateSchema` — o corpo do `POST` |
> | `<tabela>UpdateSchema` | `<recurso>UpdateSchema` — o corpo do `PATCH` |
> | `<tabela>SelectSchema` | `<recurso>Schema` — a resposta do detalhe |
> | `<recurso>ListSchema` | a linha da lista, **mais estreita** que o detalhe |
>
> Os nomes de campo também mudaram: a chave estrangeira do item é **`itemId`**
> (e não `inventoryItemId`), a resposta vem no envelope **`{ data: ... }`**, e
> o item de estoque é `/api/v1/inventory/items` (no plural).

`contacts/beneficiary` é a referência: ele já está nos três modos, valida com o
mesmo schema que a API usa, e é o que o build e o PR validam.
`inventory/item` é a referência de um formulário de **catálogo**, com coluna
derivada.
`inventory/donation` e `inventory/delivery` são a referência de um formulário
**de documento**, com a lista de itens.

`lib/queries/<area>/<recurso>.ts` é o **mesmo arquivo** que a tabela criou — um
recurso lê e escreve em um arquivo só. Aqui é só a metade que escreve.

| Arquivo | Copiar de |
|---|---|
| `lib/queries/<area>/<recurso>.ts` | `lib/queries/contacts/beneficiaries.ts` (as mutations que faltam) |
| `components/forms/<area>/<recurso>.tsx` | `components/forms/contacts/beneficiary.tsx` |
| `routes/_authenticated/<area>/<recurso>/new.tsx` | `.../contacts/beneficiaries/new.tsx` |
| `routes/_authenticated/<area>/<recurso>/$id.tsx` | `.../contacts/beneficiaries/$id.tsx` |

Comece por [`frontend-tabela.md`](frontend-tabela.md): a lista é o que dá de
acesso ao registro, e `lib/queries/<area>/<recurso>.ts` já existe quando você
chegar aqui.

## Reutilizar, não reescrever

As primitivas de `components/forms/fields.tsx` — `TextField`, `NumberField`,
`SelectField`, `CheckboxField`, `TextareaField` e `SubmitField`. Elas já fazem a
coerção do `onChange`, o `aria-invalid` e a mensagem de erro, e o `EditableProvider`
trava todos os campos de uma vez. **Não escreva um `<Input>` solto dentro do
formulário.**

As mutations, espelhando o nome do guia de `queryOptions` do TanStack:
`createBeneficiaryMutation()`, `updateBeneficiaryMutation()` e
`beneficiaryOptions(id)`. As duas primeiras são **hooks** (`$api.useMutation`),
então não são "options" — e é por isso que o `useMutation` é chamado no topo do
componente, nunca dentro de um `return` condicional.

> **Regra dos hooks com `$api.useMutation`.** O `useMutation` é um hook e deve ser chamado incondicionalmente no topo do componente — nunca dentro de uma expressão JSX após um `return` condicional (`if (loading) return ...`). Se o hook for chamado só no render que não retorna, o número de hooks muda entre renders e quebra (`Rendered fewer hooks than expected`). O padrão correto: chamar `$api.useMutation(...)` diretamente no componente do formulário (`components/forms/<recurso>.tsx`), extrair `mutateAsync` e `isPending`, e chamar `mutateAsync` no `onSubmit`. Não passe o hook como prop pelo `route` para evitar chamá-lo depois dos `return`.

```ts
export type BeneficiaryFormValues = RequiredNullable<
	ZodInfer<typeof beneficiaryCreateSchema>
>;
```

`RequiredNullable` tira o `undefined` do schema para nenhum campo virar
`value={undefined}` num input controlado. A definição é local ao arquivo de
queries do recurso — copie dali.

## Pontos que precisam espelhar

- **O estado do formulário é o payload.** Não existe passo de tradução no
  `onSubmit`: quem converte é o `onChange` da primitiva. É por isso que dá para
  validar com o `*CreateSchema` direto, sem duplicar regra. A `DateField` é o
  caso disso: ela fala a string ISO 8601 do contrato, e não um `Date`.
- **Valide com o schema do modo**: `*CreateSchema` para criar, `*UpdateSchema`
  para editar. O de update é mais leniente — `name` fica opcional — e é por isso
  que o formulário **manda todos os campos sempre** (veja o item "Mande os N
  campos sempre" abaixo). Quem valida com o `*CreateSchema` nos dois modos
  resolve o mesmo problema, mas diverge do que o código faz.
- **A mensagem do zod é lida na tela, então vai em português** — e isso *não*
  muda a API. `errorFromIssue` só embute `issue.message` no ramo `custom`, que
  exige um issue de `z.refine()`; `too_small` e `invalid_format` caem no
  `default` e viram `Field 'x' has an invalid value.`.
- A mutation de update recebe o `id` como **argumento separado** do payload.
  `parseBody` rejeita `id` no corpo com `READ_ONLY_FIELD` antes mesmo do zod.
- **`mutateAsync` com `await`, e só depois o `invalidateQueries`.** A ordem é
  load-bearing. Com `mutate` (sem `await`), o `PATCH` sai e a invalidação marca a
  lista como stale na mesma hora: como a query da lista não tem observador na tela
  do detalhe, `invalidateQueries` não busca nada ali — o `GET` só acontece quando
  a tabela monta de novo, e aí corre contra o `PATCH`, que faz três queries no D1
  contra uma do `GET`. Quando o `GET` chega primeiro, ele grava no cache a linha
  antiga com `dataUpdatedAt` novo, o `staleTime` segura os 5 segundos seguintes e
  nada revalida: a lista volta velha e só um F5 conserta. Com `mutateAsync` o
  `await` garante que a escrita está committed antes de invalidar.
- **`try`/`catch` em volta do `mutateAsync`, e `return` no `catch`.** `mutateAsync`
  lança onde `mutate` engolia. O `catch` evita a rejeição solta e, de brinde,
  segura a navegação: em erro de servidor o formulário fica no lugar com o
  preenchimento intacto, em vez de navegar e descartar o que a pessoa digitou. O
  erro continua indo para o `console` pelo `MutationCache` global — a exibição
  na tela é o item 5 de [`backlog-pi2.md`](backlog-pi2.md), e é no `catch` que
  ela vai entrar.
- **Invalide antes de navegar, nunca depois.** Na ordem inversa a tabela monta e
  busca com dado velho, e só então invalida: dois `GET` por save.
- **Não use `router.invalidate()` para isto.** Ele reexecuta o `beforeLoad` da
  rota que está saindo. O único `beforeLoad` é o `ensureQueryData(sessionOptions)`
  de `_authenticated.tsx`, e a sessão tem `staleTime` de 5 minutos, então nunca
  busca. Os dados da tabela vivem no cache de query, não em loader de rota.
- **Devolva a pessoa para a página de onde ela saiu.** A lista mora na
  `?page`/`?sort`, então o formulário lê o contexto do `state` da navegação com
  `useListView()` e o usa como `search` tanto no **Voltar para a lista** quanto no
  `navigate` do `onSubmit`. Sem isso, voltar cai na primeira página — e o
  componente desmonta ao navegar, então nada na tela sobrevive para recuperar.
- **Voltar para a lista é `<a>`, não `<button>`.** Sai de um `Button` com
  `nativeButton={false}` e `render={<Link />}`, então quem procura o botão por
  seletor `button` no teste não acha — e é o que a navegação por teclado precisa.
- Três modos num componente só: `beneficiary` ausente cria, presente visualiza, e
  `isEditing` interno libera a edição. `Cancelar` faz `form.reset()` antes de
  voltar, senão a tela mostraria alteração não salva.
- Mande todos os campos sempre. A API aceita `PATCH` parcial, mas um corpo vazio
  é `400 EMPTY_UPDATE`.
- Enums: `UFS`, `TIPOS_IMOVEL` e `ESTADOS_CIVIS` são exportados de
  `src/schemas/api/enums.ts` — o **contrato**, e não o Drizzle. O *rótulo* em
  português é interface e fica no frontend; o valor `UPPER_SNAKE` é o contrato
  com o servidor.
- `Button` com `render={<Link />}` precisa de `nativeButton={false}`, senão o
  Base UI reclama que espera um `<button>` nativo.
- A rota do registro é `<area>/<recurso>/$id.tsx` e a de criação é
  `<area>/<recurso>/new.tsx`. As duas são irmãs estáticas e não competem pelo
  mesmo segmento, porque o roteador ranqueia a estática acima da dinâmica.
- Não edite `route-tree.tsx`, ele é gerado.

## O que vem depois

`donor` já aplica esta receita: os campos de identificação e endereço, com
texto e o enum `uf`, nos modos de criação, visualização e edição. O retorno do
detalhe preserva página e ordenação; após criar, a lista abre na página 1.

`inventory/item` e `inventory/category` são catálogo, e `inventory/donation` e
`inventory/delivery` são documentos — com a lista de itens, que é o conteúdo, e
com os verbos de concluir, cancelar e estornar. O desenho novo está em
[`frozen/modelos-db.md`](frozen/modelos-db.md), e o desenho do modelo anterior,
em [`future/README.md`](future/README.md), é leitura histórica.

Duas coisas que só aparecem nesses formulários e que valem lembrar:

- **Data tem primitiva.** `DateField` existe em `forms/fields.tsx`, e é o que
  o `occurred_at` usa. O estado do formulário é a **string ISO 8601** do
  contrato e não um `Date`: o estado do formulário é o payload, e o que a API
  aceita é a string. A primitiva converte no `onChange`, e o formulário não
  traduz nada no `onSubmit`.
- **A ficha tem a tabela de filhos abaixo do formulário**, com adicionar, ver e
  remover. No modelo novo, a linha de filho é `{ itemId, quantity }` e o
  formulário de entrega e o de doação **precisam** dela — é o que faz a entrega
  reservar estoque.

## O formulário de um documento

A doação e a entrega são os dois formulários que carregam **itens**, e a
diferença do modelo novo é que a lista de itens **é** o conteúdo do documento:

- O array é um campo do formulário, em `mode="array"`, e o `pushValue` /
  `removeValue` do handle do campo cuidam das linhas.
- A linha é `{ itemId, quantity }`, e os dois campos apontam para o mesmo
  registro de item — o `itemId` é a chave estrangeira.
- **A lista só é editável na criação.** No modo de visualização e no de
  edição, o conteúdo é o que foi criado: o `PATCH` do cabeçalho **não** leva
  os itens, porque o conteúdo de um documento é fixo. Corrigir é estornar e
  recriar.
- O `onSubmit` monta o **cabeçalho** à mão, porque ele é um subconjunto do
  corpo do `POST`:

```ts
const cabecalho = {
	donorId: parsed.data.donorId,
	occurredAt: parsed.data.occurredAt,
	note: parsed.data.note,
};
```

## O select de item: busca, ordem e o teto da quantidade

O `SelectField` de `forms/fields.tsx` é um `<select>` nativo, e com 130 itens
no catálogo ele não serve: a pessoa rola a lista procurando "arroz" e não
acha. O select de item precisa de três coisas:

### Busca

Um `<select>` nativo não busca. O campo precisa de um **combo**: um input que
filtra e uma lista de opções, e o valor continua sendo o **id** — a linha do
formulário é `{ itemId, quantity }`, e o `itemId` é o que a API quer.

O filtro é o mesmo das tabelas: sem acento, e case-insensitive.

### Ordem alfabética

As opções vão em **ordem alfabética**, pelo nome, e não na ordem em que a API
devolveu. A ordem da API é a de inserção, que é a do seed, e que não significa
nada para quem está procurando. O `label` é o nome, e o `value` é o id.

### O disponível, e o teto da quantidade

A linha do item mostra **quanto há disponível** ao lado do nome — o físico
menos o reservado, que é o `available` do `GET /api/v1/stock`:

```
Arroz 5kg (KG) — disponível 14
[ Arroz 5kg (KG) ▾ ]  [ 3 ]
```

E a quantidade **não pode passar do disponível**. É a mesma regra que o
`ledger_guard` aplica no banco — a tela é a conveniência, o trigger é a
garantia. A API responde `409 INSUFFICIENT_STOCK` quando o teto é furado, e
quem escreve a mensagem na tela é o item 1 do
[`backlog-pi2.md`](backlog-pi2.md#o-acabamento-das-telas).

O `available` vem do `GET /api/v1/stock`, que já devolve item por item com
físico, reservado e disponível. A tela de documento já usa o catálogo em cache
(`itemsOptions`); o saldo é outra query, e é ela que dá o número.

## Os verbos na tela do registro
O registro tem verbos próprios, e eles são botões ao lado do "Editar", no
topo do formulário — a pessoa está olhando a entrega e quer concluí-la, não
editar o cabeçalho:

| Botão | Chamada | Quando aparece |
|---|---|---|
| Estornar doação | `POST /donations/{id}/void` | a doação está `RECEIVED` |
| Concluir entrega | `POST /deliveries/{id}/complete` | a entrega está `OPEN` |
| Cancelar entrega | `POST /deliveries/{id}/cancel` | a entrega está `OPEN` |

O botão só aparece quando a transição é válida, e a API recusa a transição
errada com `400 INVALID_TRANSITION` de qualquer jeito — a tela não é a
validação, ela é a conveniência.

## `SelectField` alimentado por outra lista

**Já tem exemplo**: `forms/inventory/delivery.tsx` usa o `SelectField` com as
opções vindas de `fkOptions("beneficiaries", beneficiariesData ?? [])`, que está
em `lib/fk-factory.ts`. A query da tabela de origem já existe, e as opções são
o array dela (`{ value: linha.id, label: linha.name }` — o `value` é o que vai no
corpo, e é o `id` que a coluna espera). Cuide de três coisas que o `Select` do Base
UI não resolve sozinho:

1. **Lista vazia.** Sem doadores não há o que selecionar; deixe o `placeholder`
   aparecer em vez de um item em branco.
2. **Rótulo em vez de id.** O `value` do item é o `id`, e o texto mostrado é o
   rótulo.
3. **`notNull`.** Se a coluna é `notNull`, o `SelectField` precisa começar com um
   valor real, e não com o `null` do `initialValues`.

## Fora de escopo

- **Não mexa em `src/worker/`.** Esquema, rotas e migrations estão congelados
  nesta rodada — a branch `mess/but-in-a-good-way` levanta o congelamento,
  porque o modelo de estoque está sendo trocado por um ledger. Ver a exceção no
  [`../AGENTS.md`](../AGENTS.md).
- **Não escreva tela de `coleta`, `entrega` ou `item`.** Eles saíram do banco em
  01/10/2026, e `donation_line` e `delivery_line` saíram no redesenho para
  ledger; ver [`frozen/modelos-db.md`](frozen/modelos-db.md).
- Não exibia erro de mutation na tela. Não há `Alert`, nem `toast`, nem
  `errorMap` por campo: o `MutationCache` em `lib/query-client.ts` joga no
  `console` e pronto.
- Não adicione ordenação, filtro, máscara de CEP, ViaCEP, exclusão nem upload.
- Não crie `create-<recurso>.tsx`, `view-<recurso>.tsx` nem `edit-<recurso>.tsx`:
  é um componente só, com o modo interno.
- Não desabilite uma regra do eslint para o lint passar. Ajuste o código.

## Padrão de mutation com `$api`

Todos os formulários operam com `$api.useMutation` chamado diretamente no
componente do formulário (`components/forms/<area>/<recurso>.tsx`), sem passar
mutation como prop pelo `route`. **Não passe `mutateAsync`/`isPending` como prop
pelo componente de rota** — isso evita o risco de chamar o hook depois de um
`return` condicional e quebrar as regras dos hooks (`Rendered fewer hooks than
expected`).
