# `future/`

O que **não existe ainda** e está previsto. Não é tarefa deste trimestre.

| Documento | O que é |
|---|---|
| [`adaptacoes-nova-stack.md`](adaptacoes-nova-stack.md) | Matriz de migração das telas do PI I, papéis e acessibilidade |

## Redesenho de estoque

**Estado: implementado em 01/10/2026.** As tabelas, as sete operações, o seed e
a verificação existem; o desenho abaixo é o que foi implementado, e o que
sobrou é o rename de `assistido` e `doador` e as telas. `coleta`, `entrega`,
`item`, `nome_item` e `categoria_item` saíram do banco pela migration
`20261001222515_remarkable_wendell_rand`. A forma das tabelas está em
[`../frozen/modelos-db.md`](../frozen/modelos-db.md) e o contrato das rotas, em
[`../frozen/api.md`](../frozen/api.md).

O modelo antigo — `item` como unidade física, `status` como coluna, `nome_item`
como catálogo separado — está errado em três pontos que valem registrar, porque
é o que motivou a troca.

**O estoque não tinha lugar.** `item` era ao mesmo tempo a unidade física, o
registro de estoque e a reserva, e `item.status` era uma segunda cópia do que os
dois `id` já diziam. O seed prova que ela discorda: `sortearStatus` sorteia o
status e só depois deriva `coleta_id` e `entrega_id`, então há linhas
`EM_ESTOQUE` que já têm coleta. Um campo que só pode discordar não é campo.

**A doação não distinguia declarado de recebido.** O `status` `AGUARDA_COLETA`
tentava cobrir isso, mas não havia momento em que o estoque entrasse de fato: o
contador nascia junto com a linha.

**Não dava para somar.** Sem quantidade, "20 kg de arroz" e "3 panelas" são a
mesma coisa, e uma entrega precisa reescrever o estoque item por item.

### Nomes

Tudo em inglês, com o termo que a indústria já usa. Só a interface e as rotas
ficam em português.

| hoje | vira | por quê |
|---|---|---|
| `item` | `inventory_item` | Shopify, commercetools |
| `categoria_item` | `item_category` | |
| `nome_item` | fundido em `inventory_item.name` | a linha da doação já carrega o nome |
| `coleta` | `donation` | |
| — | `donation_line` | charity retail |
| `entrega` | `delivery` | |
| — | `delivery_line` | é a reserva |
| `doador` | `donor` | |
| `assistido` | `beneficiary` | |
| `item.status` | **some** | é derivado dos dois contadores |
| `data_hora` | `occurred_at` | |
| `quantidade` | `quantity` | |
| `unidade` | `unit` | `KG`, `L`, `UNIT`, `PACK`, `BOX` |

Funde-se `nome_item` em `inventory_item` porque a linha da doação **é** o item,
e `inventory_item.name` é `UNIQUE` — a deduplicação de nome acontece na camada
certa, que era o motivo de `nome_item` existir.

O custo sai do outro lado: `doador` vira `donor` e `assistido` vira `beneficiary`,
então **as 7 tabelas atuais precisam ser renomeadas junto**. Isso toca a tela de
`assistido`, que já foi mergeada, e a de `doador`, que é a próxima.

### Schema

```ts
item_category(id, name)                                  unique on lower(name)

inventory_item(id, name, category_id, unit,
               on_hand, reserved_quantity,
               available /* GENERATED: on_hand - reserved_quantity */)

donation(id, donor_id, occurred_at, status, note)         DRAFT -> RECEIVED
donation_line(donation_id, inventory_item_id, quantity)    PK (donation_id, inventory_item_id)

delivery(id, beneficiary_id, occurred_at, status, note)    OPEN -> COMPLETED | CANCELLED
delivery_line(delivery_id, inventory_item_id, quantity)    PK (delivery_id, inventory_item_id)

inventory_count(id, occurred_at, counted_by, note)
inventory_count_line(count_id, inventory_item_id, counted_quantity)
inventory_adjustment(id, inventory_item_id, delta, reason, occurred_at, count_id)
```

`reason` ∈ `STOCKTAKE`, `DONOR_RETURN`, `LOSS`, `DAMAGE`, `CORRECTION`.
`donation.donor_id` é `notNull`: a doação conciliatória deixou de existir, porque
o ajuste é simétrico e absorveu os dois sentidos. `onDelete: "no action"` em
todas — cancelar uma entrega **libera**, nunca cascateia.

**Sem `CHECK`.** Vale a regra 2 de [`../frozen/seguranca.md`](../frozen/seguranca.md):
`quantity > 0`, `unit` válida e transição válida são zod, e não constraint, porque
`handleApiError` não traduz `CHECK constraint failed` e a escrita rejeitada voltaria
como `500`.

### Onde o estoque mora

Em **dois contadores honestos**, e um campo gerado que ninguém escreve:

```ts
on_hand           // físico na pessoa jurídica, só muda por recebimento, conclusão e ajuste
reserved_quantity // desse total, o que está comprometido com entrega aberta
available         // on_hand - reserved_quantity, generated
```

`available` é coluna gerada (`VIRTUAL`), então não tem como divergir da aritmética
por descuido — ninguém escreve nela. E o guard da reserva usa a aritmética
escrita à mão, `(on_hand - reserved_quantity) >= ?`, e não a coluna gerada, porque
uma coluna virtual dentro do `WHERE` de um `UPDATE` é exatamente o tipo de coisa
que muda de comportamento entre builds de SQLite.

Isso é o que resolve o debate contador-ou-derivado: **contador é perigoso quando é
a única cópia, e inofensivo quando é verificável.** Os dois são reconstruíveis:

```
reserved_quantity = SUM(delivery_line) JOIN delivery WHERE status = 'OPEN'

on_hand = SUM(donation_line)  JOIN donation  WHERE status = 'RECEIVED'
         - SUM(delivery_line) JOIN delivery  WHERE status = 'COMPLETED'
         + SUM(inventory_adjustment.delta)
```

### As sete operações

| operação | `on_hand` | `reserved_quantity` | piso |
|---|---|---|---|
| receber doação (n) | **+n** | — | — |
| reservar (n) | — | **+n** | `≤ on_hand`, senão `409` |
| concluir entrega (n) | **−n** | **−n** | — |
| cancelar entrega (n) | — | **−n** | — |
| inventário (c) | **:= c** | — | `c >= reserved_quantity` |
| correção (v) | **:= v** | — | `v >= reserved_quantity` |
| ajuste (±n) | **±n** | — | `on_hand >= 0` |

Concluir entrega decreta os dois porque a mercadoria saiu do estoque e a reserva
foi consumida: o `available` **não muda**, que é o certo — já estava indisponível
desde a reserva.

Correção e inventário movem **só `on_hand`**, nunca `reserved_quantity`. Reserva
errada se corrige cancelando e recriando a entrega, e não por ajuste; é o que
mantém os dois contadores independentes.

Receber, concluir e cancelar são **2 statements, independentes de N**. Reservar é
2N, e no plano Free o teto de 50 queries por invocação põe o limite prático em
**uns 45 itens distintos por entrega** — que é um limite de domínio, e vale
escrever na tela.

### A regra de idempotência

A instrução dependente **recheca a pré-condição e roda antes da transição**, e a
transição é sempre a última:

```sql
UPDATE inventory_item SET on_hand = on_hand + COALESCE((
  SELECT SUM(quantity) FROM donation_line
  WHERE donation_id = ? AND inventory_item_id = inventory_item.id
), 0)
WHERE id IN (SELECT inventory_item_id FROM donation_line WHERE donation_id = ?)
  AND EXISTS (SELECT 1 FROM donation WHERE id = ? AND status = 'DRAFT');

UPDATE donation SET status = 'RECEIVED' WHERE id = ? AND status = 'DRAFT';
```

Na segunda execução o `EXISTS` é falso, o crédito é pulado, e a transição muda
zero linhas. **Sem trigger, sem tabela guard, sem incremento compensatório** — e
sem o `INSERT` de uma linha de auditoria que pode falhar depois do contador.

`SET x = v` é idempotente por natureza; `SET x = x + v` nunca é. Por isso
inventário e correção usam `:=` e reserva usa `+=`. A regra vale para as três
transições, com o mesmo formato.

### A reserva

Continua **guardada e por item**. O `409` não some: ele muda de função, de
"impedir" para "dizer por quê, com o número". D1 devolve `meta.changes` por
statement de um `db.batch()`, então as faltas saem de graça:

```ts
const results = await db.batch(statements);
const short = items.filter((_, i) => results[i].meta.changes === 0);
```

```sql
UPDATE inventory_item
SET reserved_quantity = reserved_quantity + ?2
WHERE id = ?1 AND on_hand - reserved_quantity >= ?2
RETURNING id
```

Uma linha por item reservada, zero por item sem estoque. A linha da
`delivery_line` que não conseguiu reserva é apagada, e essa compensação é segura
porque **apagar linha é idempotente e incrementar contador não é** — é a
assimetria que sustenta o desenho inteiro.

### Inventário e correção

**Inventário** (`inventory_count`) é o registro do que foi fisicamente contado,
com quem e quando; a aplicação gera o `inventory_adjustment` com
`delta = counted_quantity - on_hand`, e `on_hand := counted_quantity`. Como se
conta o que está na prateleira, **`on_hand` recebe o número contado direto**, sem
aritmética — reservado ou não, o saco está lá.

Depois de um inventário correto ainda pode haver `available` negativo, e aí é
**problema da entrega, não do estoque**: você prometeu 10 e tem 7. A tela precisa
distinguir os dois casos.

**Correção** (`inventory_adjustment` com `reason` `CORRECTION`) é a saída
registrada quando a reserva bate na guarda:

```sql
INSERT INTO inventory_adjustment (id, inventory_item_id, delta, reason, occurred_at)
SELECT ?, ?, ? - on_hand, 'CORRECTION', ? FROM inventory_item WHERE id = ?;

UPDATE inventory_item SET on_hand = ? WHERE id = ? AND ? >= reserved_quantity;
```

O `delta` sai do valor anterior porque a instrução 1 roda antes da 2, e o batch
é uma transação só. Se o popup tentar um total **abaixo de `reserved_quantity`**,
a instrução 2 muda zero linhas, o batch inteiro volta, e **nenhum ajuste é
registrado**. Por isso o popup precisa mostrar `reserved_quantity` como piso — sem
isso o usuário toma `409` da própria correção.

### Invariantes e verificação

```
on_hand >= reserved_quantity >= 0     ->  available >= 0, sempre
reserved_quantity == SUM(delivery_line) JOIN delivery WHERE status = 'OPEN'
```

Duas queries, as duas devem devolver zero linhas, e a segunda é a que pega o
único vetor de drift real — uma `delivery_line` escrita sem o contador:

```sql
SELECT id, name FROM inventory_item
WHERE on_hand < 0 OR reserved_quantity < 0 OR reserved_quantity > on_hand;

SELECT i.id, i.reserved_quantity, COALESCE(SUM(dl.quantity), 0) AS esperado
FROM inventory_item i
LEFT JOIN delivery_line dl
  ON dl.inventory_item_id = i.id
 AND EXISTS (SELECT 1 FROM delivery d
             WHERE d.id = dl.delivery_id AND d.status = 'OPEN')
GROUP BY i.id
HAVING i.reserved_quantity != COALESCE(SUM(dl.quantity), 0);
```

O stub de [`../../tests/api.ts`](../../tests/api.ts) é sem estado e não expressa
ciclo de vida, então essas duas são asserções de Insomnia contra D1 local — o
mesmo padrão do resto.

### Papel do usuário: hoje é aviso, não permissão

Quem bate na guarda vê o `409` com o disponível e o botão **Corrigir quantidade
no estoque**, com aviso de que a correção fica registrada. O endpoint de ajuste
fica **sem permissão neste ciclo**, e isso é limitação conhecida, não oversight.

O desenho de papéis é `user` e `supervisor`, com o supervisor autorizado a
corrigir e o usuário orientado a pedir. Ele **não é implementável antes do #13**,
porque `member` é escopado por `organization_id`, as tabelas de domínio não têm
esse campo e a API não filtra por organização — é a armadilha 1 do
[`../../AGENTS.md`](../../AGENTS.md). Papéis é trabalho **depois** do isolamento
multi-tenant, não em paralelo a ele.

Dois detalhes que já estão resolvidos pela estrutura, para quando chegar:
`member.role` **já existe** (coluna `text` default `"member"`, do plugin
`organization()` que está ativo em `auth.ts`), então não há tabela nova de papéis;
e `rg "role|403|hasPermission"` em `src/worker/` não devolve nada, ou seja, a
autorização da correção seria o **primeiro** check de permissão da API inteira.
Vale saber que é precedente, não incremento. Mais adiante: granularidade por
ação, e o supervisor receber o pedido para aprovar ou vetar.

### O que ainda precisa ser verificado

Nada abaixo está confirmado, e é o que um spike precisa medir antes da primeira
migration:

- **Coluna gerada no D1.** O drizzle `1.0.0-rc.4` expõe
  `.generatedAlwaysAs(as, { mode })`, mas o D1 aceitar a coluna é outra coisa.
- **`json_each` no D1.** Sem ele, criar item novo custa 2 statements por linha
  (`INSERT OR IGNORE` e depois `SELECT id ... WHERE lower(name) = ?`), porque
  `ON CONFLICT` sobre índice de expressão é delicado.
- **`meta.changes` por statement num `db.batch()`**, que é de onde sai a lista de
  faltas da reserva.

## O que também está planejado

- **Isolamento por organização** ([#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13)).
  O plugin `organization()` do Better Auth **está ativo** em
  `src/worker/auth.ts` e as tabelas de organização existem em `auth-schema.ts`,
  mas as tabelas de domínio **não têm `organization_id`** e a API não filtra por
  organização. É a isca mais fácil deste repo para quem for mexer nele: não
  introduza um valor fixo para "simular" o filtro. **Papéis dependem disto.**
- **Papéis `user` e `supervisor`** — ver a seção acima.
- **`403` cross-tenant** e os testes de isolamento. Não há `403` em lugar nenhum
  da API hoje.
- **ViaCEP** — preencher endereço pelo CEP. Proposta em
  [`../backlog-pi2.md`](../backlog-pi2.md).
- **Tratar `CHECK constraint failed`** em `handleApiError`, que hoje vira `500`.
- **Teste de acessibilidade** com axe.
- **Exibir erro de mutation na tela.** Hoje o `MutationCache` joga no
  `console`.
