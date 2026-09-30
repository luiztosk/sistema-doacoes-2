# `future/`

O que **não existe ainda** e está previsto. Não é tarefa deste trimestre.

| Documento | O que é |
|---|---|
| [`adaptacoes-nova-stack.md`](adaptacoes-nova-stack.md) | Matriz de migração das telas do PI I, papéis e acessibilidade |

## Redesenho de coleta, entrega e item

O modelo de **doação → estoque → entrega** está em revisão antes de ganhar tela.
Leia isto antes de escrever qualquer coisa sobre esses três recursos — inclusive
antes de criar a tela, porque tela é a parte que mais se perde.

**Decidido**

- **`item` não é escrito pelo cliente.** Nasce dentro de `POST /coletas` e muda
  de estado quando coleta ou entrega muda. O frontend não manda a sequência de
  patches, porque uma sequência parcial corrompe o estoque e não há como desfazer
  isso com segurança.
- **Disponibilidade é derivada, nunca armazenada.** Vale
  `item.quantidade − SUM(entrega_item.quantidade)`. Um contador guardado, com
  incremento ao cancelar, é o desenho em que o cancelamento devolve o estoque
  duas vezes; sem nada guardado, não há o que duplicar.
- **Cancelar exclui a reserva, não devolve por incremento.** Rodar de novo apaga
  zero linhas. Concluir mantém as linhas e muda só o estado do pai.
- **A reserva é condicionada.** É um `INSERT` guardado por condição
  (`WHERE disponivel >= n`): se não cabe, volta zero linha e a requisição é
  `400`. Uma entrega inteira vai num `db.batch()`, que no D1 é atômico.
- **Quantidade por linha de doação**, não por unidade física.
- **`nome_item` e `categoria_item` passam a ter tela.** O catálogo é aditivo:
  quem registra uma doação pode trazer um item que não está nele. É a única
  exceção ao congelamento do backend, e ainda não foi implementada.

**Aberto**

- **Fundir `nome_item` em `item`, ou manter o catálogo?** Fundir dá a quantidade
  pela linha de doação mas **perde a deduplicação de nome**, que era o motivo de
  `nome_item` existir. Dá para recuperar agrupando por
  `(categoria, lower(nome))` na leitura e somando, em vez de forçar um nome
  canônico na escrita.
- **`item.status` vira coluna, ou some?** Se a disponibilidade já é aritmética,
  status é uma segunda fonte dizendo a mesma coisa, e pode discordar dela.
- **Enum final de `entrega.estado`,** e onde entra o cancelamento.
- **Trilha de auditoria:** se for preciso saber quem retirou quanto e quando, em
  favor de qual entrega, a soma derivada não dá isso de graça e o padrão passa a
  ser ledger de movimentos.

Como a escrita aninhada não é expressável por `registerResource`, `coleta`,
`entrega` e `item` saem dele. E `GET /estoque` precisa de join e de filtro por
categoria, que é indexado: trazer o estoque inteiro para o navegador estoura o
orçamento diário de linhas lidas do D1.


## O que também está planejado, sem documento próprio

Estão no item 3 e no item 4 do
[`../backlog-pi2.md`](../backlog-pi2.md), e valem a mesma regra: não implemente
nesta rodada.

- **Isolamento por organização** ([#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13)).
  O plugin `organization()` do Better Auth **está ativo** em
  `src/worker/auth.ts` e as tabelas de organização existem em `auth-schema.ts`,
  mas as tabelas de domínio **não têm `organization_id`** e a API não filtra por
  organização. É a isca mais fácil deste repo para quem for mexer nele: não
  introduza um valor fixo para "simular" o filtro.
- **ViaCEP** — preencher endereço pelo CEP. Proposta em
  [`../backlog-pi2.md`](../backlog-pi2.md).
- **`403` cross-tenant** e os testes de isolamento.
- **Tratar `CHECK constraint failed`** em `handleApiError`, que hoje vira `500`.
- **Teste de acessibilidade** com axe.
- **Exibir erro de mutation na tela.** Hoje o `MutationCache` joga no
  `console`.
