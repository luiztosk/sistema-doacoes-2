# Como adicionar o formulário de um recurso

`assistido` é a referência: ele já está nos três modos, valida com o mesmo
schema que a API usa, e é o que o build e o PR validam.

`lib/api/<recurso>.ts` é o **mesmo arquivo** que a tabela criou — um recurso lê
e escreve em um arquivo só. Aqui é só a metade que escreve.

| Arquivo | Copiar de |
|---|---|
| `lib/api/<recurso>.ts` | `lib/api/assistidos.ts` (as 3 mutations que faltam) |
| `components/forms/<recurso>.tsx` | `components/forms/assistido.tsx` |
| `routes/_authenticated/<recurso>/novo.tsx` | `.../assistidos/novo.tsx` |
| `routes/_authenticated/<recurso>/id/$id.tsx` | `.../assistidos/id/$id.tsx` |

Comece por [`frontend-tabela.md`](frontend-tabela.md): a lista é o que dá de
acesso ao registro, e `lib/api/<recurso>.ts` já existe quando você chegar aqui.

## Reutilizar, não reescrever

As primitivas de `components/forms/fields.tsx` — `TextField`, `NumberField`,
`SelectField`, `CheckboxField`, `TextareaField` e `SubmitField`. Elas já fazem a
coerção do `onChange`, o `aria-invalid` e a mensagem de erro, e o `EditableProvider`
trava todos os campos de uma vez. **Não escreva um `<Input>` solto dentro do
formulário.**

As três mutations, espelhando o nome do guia de `queryOptions` do TanStack:
`createAssistidoOptions`, `updateAssistidoOptions(id)` e
`assistidoDetailOptions(id)`.

```ts
export type AssistidoFormValues = RequiredNullable<
	ZodInfer<typeof assistidoInsertSchema>
>;
```

`RequiredNullable` tira o `undefined` do schema para nenhum campo virar
`value={undefined}` num input controlado. Copie a definição; ela está em
`lib/api/assistidos.ts`.

## Pontos que precisam espelhar

- **O estado do formulário é o payload.** Não existe passo de tradução no
  `onSubmit`: quem converte é o `onChange` da primitiva. É por isso que dá para
  validar com `*InsertSchema` direto, sem duplicar regra.
- **Valide com o `*InsertSchema` nos dois modos**, nunca com o `*UpdateSchema`:
  o de update torna `nome` opcional, então um `nome` vazio passaria no cliente e
  tomaria `400` no servidor.
- **A mensagem do zod é lida na tela, então vai em português** — e isso *não*
  muda a API. `errorFromIssue` só embute `issue.message` no ramo `custom`, que
  exige um issue de `z.refine()`; `too_small` e `invalid_format` caem no
  `default` e viram `Field 'x' has an invalid value.`.
- `updateAssistidoOptions` recebe o `id` como **argumento separado** do payload.
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
- Três modos num componente só: `assistido` ausente cria, presente visualiza, e
  `isEditing` interno libera a edição. `Cancelar` faz `form.reset()` antes de
  voltar, senão a tela mostraria alteração não salva.
- Mande os 25 campos sempre. A API aceita `PATCH` parcial, mas um corpo vazio é
  `400 EMPTY_UPDATE`.
- Enums: `UFS`, `TIPOS_IMOVEL` e `ESTADOS_CIVIS` já são exportados de
  `schema.ts`. O *rótulo* em português é interface e fica no frontend; o valor
  `UPPER_SNAKE` é o contrato com o servidor.
- `Button` com `render={<Link />}` precisa de `nativeButton={false}`, senão o
  Base UI reclama que espera um `<button>` nativo.
- A rota do registro tem um segmento `id` antes do parâmetro, então
  `/assistidos/novo` e `/assistidos/id/<uuid>` são duas rotas estáticas irmãs e
  não competem pelo mesmo segmento. Sem ele, `novo` só não caía em `$id` porque
  o roteador ranqueia estática acima de dinâmica.
- Não edite `route-tree.tsx`, ele é gerado.

## O que vem depois

`doador` é o próximo e está **liberado**: é o `assistido` sem a parte social, só
texto e o enum `uf`. Comece por ele.

`coleta`, `entrega` e `item` **não ganham tela**: o modelo já foi decidido e vira
`donation`, `delivery` e `inventory_item`, com `donation_line` e `delivery_line`
abaixo. Não escreva nem o formulário deles: o estado do formulário é o payload, e
o payload muda de forma. O desenho está em
[`future/README.md`](future/README.md).

Duas coisas que só aparecem nesses formulários e que valem lembrar quando o
redesenho for implementado:

- **Nenhuma primitiva faz data.** As duas fichas têm `occurred_at`, que é
  `z.coerce.date()`, então o estado do formulário é `Date | null` e não `string`
  — um `DateField` precisa ser escrito, e não é um `TextField` com
  `type="date"`, porque o `value` do input é `"AAAA-MM-DD"`.
- **A ficha tem a tabela de filhos abaixo do formulário**, com adicionar, ver e
  remover, e a linha de filho carrega `quantity`. Nada no código exemplifica esse
  padrão ainda: o `assistido` não tem filho, então ele **não** serve de
  referência aqui.

## Sem exemplo ainda

`SelectField` **alimentado por outra lista** não tem exemplo, e não vai ter até o
redesenho de coleta e entrega: os únicos recursos com chave estrangeira são os que
não ganharam tela. `doador`, que é o próximo, só tem texto e o enum `uf`.

Quando o caso aparecer, a query da tabela de origem já existe e as opções são o
array dela (`{ value: linha.id, label: linha.nome }` — o `value` é o que vai no
corpo, e é o `id` que a coluna espera). Cuide de três coisas que o `Select` do Base
UI não resolve sozinho:

1. **Lista vazia.** Sem doadores não há o que selecionar; deixe o `placeholder`
   aparecer em vez de um item em branco.
2. **Rótulo em vez de id.** O `value` do item é o `id`, e o texto mostrado é o
   rótulo.
3. **`notNull`.** Se a coluna é `notNull`, o `SelectField` precisa começar com um
   valor real, e não com o `null` do `initialValues`.

## Fora de escopo

- **Não mexa em `src/worker/`.** Esquema, `registerResources` e migrations estão
  congelados nesta rodada. A única exceção é registrar `nome-itens` e
  `categoria-itens`, para o catálogo ser aditivo.
- **Não escreva tela de `coleta`, `entrega` ou `item`.** O modelo de estoque já
  foi decidido e vira `donation`, `delivery` e `inventory_item`, com `donation_line`
  e `delivery_line`; ver [`future/README.md`](future/README.md).
- Não exibia erro de mutation na tela. Não há `Alert`, nem `toast`, nem
  `errorMap` por campo: o `MutationCache` em `lib/query-client.ts` joga no
  `console` e pronto.
- Não adicione ordenação, filtro, máscara de CEP, ViaCEP, exclusão nem upload.
- Não crie `create-<recurso>.tsx`, `view-<recurso>.tsx` nem `edit-<recurso>.tsx`:
  é um componente só, com o modo interno.
- Não desabilite uma regra do eslint para o lint passar. Ajuste o código.
