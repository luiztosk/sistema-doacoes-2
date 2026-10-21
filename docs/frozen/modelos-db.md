# Modelos do Banco de Dados (D1 + Drizzle ORM)

> **O modelo de estoque virou ledger.** O redesenho de 01/10/2026 — contadores
> `on_hand` / `reserved_quantity` e tabelas `donation_line` / `delivery_line` —
> está **substituído** pelo ledger de movimentos descrito aqui, decidedo em
> 19/10/2026 e **em implementação** na branch `mess/but-in-a-good-way`.
>
> O desenho anterior — sete operações, "escreve, confere, compensa" — está em
> [`../future/README.md`](../future/README.md), como leitura histórica.
> O porquê da troca está em [`../arquitetura.md`](../arquitetura.md#o-modelo-de-estoque-virou-ledger).
>
> `assistido` e `doador` já foram renomeados: são `beneficiary` e `donor`, pela
> migration `20261006192118_mushy_karen_page`.

Este documento descreve o modelo de dados do sistema, traduzido do projeto
legado do PI I (Flask + SQLAlchemy + SQLite) e adaptado para a stack atual:
**Cloudflare D1 + Drizzle ORM + Better Auth**.

## Convenções

- Banco: Cloudflare D1 (SQLite). Tipos disponíveis: `text`, `integer`, `real`.
- IDs das tabelas de domínio: `text` (UUID), para ficar consistente com as
  tabelas do Better Auth (`user`, `organization`, `member`, `invitation`), que
  usam IDs em texto.
- **Nenhuma tabela de domínio tem `organization_id`, e nenhuma vai ter.** A
  instituição é a **instância**: um deployment, um D1, uma instituição. Ver
  [`seguranca.md`](seguranca.md).
- Booleanos: `integer(..., { mode: "boolean" })` no Drizzle.
- Datas: `integer(..., { mode: "timestamp" })`.
- Enums: `text` com `enum` do Drizzle, que **só tipa o TypeScript** e não emite
  nada no DDL. A lista é a mesma que o zod recebe como `z.enum`, então o domínio
  é recusado na entrada da API e o banco aceita qualquer texto. Ver
  [Regras de valor](#regras-de-valor).
- **Os enums moram no contrato**, em
  [`src/schemas/api/enums.ts`](../../src/schemas/api/enums.ts), e o
  `src/schemas/db/` **importa** de lá: o vocabulário é do contrato, e a tabela
  segue. `UFS`, `TIPOS_IMOVEL`, `ESTADOS_CIVIS`, `UNITS`, `DONATION_STATUS`,
  `DELIVERY_STATUS`, `LEDGER_KIND` e `ADJUSTMENT_REASON` não são definidos em
  dois lugares.
- `uf` também é um enum (as 27 unidades federativas), não um `text` de 2 letras:
  `text("uf", { length: 2 })` vira `text(2)`, que no SQLite é **afinidade de
  tipo**, não constraint, e o D1 aceitaria `abc`.

## Tabelas de autenticação (Better Auth — não criar manualmente)

`user`, `session`, `account`, `organization`, `member`, `invitation` e
`verification` são geradas pelo Better Auth. A `organization` **não é a
instituição**: a instituição é a instância, e o `organization` do Better Auth
sobra da integração anterior e não é usado pelo domínio. Ver
[`seguranca.md`](seguranca.md).

## Tabelas de domínio

### `beneficiary`

Família/pessoa assistida pela instituição. No legado tinha campos socioeconômicos
detalhados (o diagrama antigo do README estava desatualizado — este é o modelo real).

| Coluna | Tipo | Obs |
|---|---|---|
| `id` | text PK | UUID |
| `name` | text | |
| `telefone` | text | obrigatório, E.164 |
| `email` | text | opcional |
| `cep` | text | preenchido via ViaCEP, opcional |
| `logradouro` | text | ViaCEP, opcional |
| `numero` | text | manual, opcional |
| `complemento` | text | opcional |
| `bairro` | text | ViaCEP, obrigatório |
| `cidade` | text | ViaCEP, obrigatório |
| `uf` | text | sigla de UF, enum das 27, obrigatório |
| `tipoImovel` | text | `ALUGADO` \| `PROPRIO`, opcional |
| `valorAluguel` | integer | em reais, opcional |
| `estadoCivil` | text | `SOLTEIRO` \| `CASADO` \| `DIVORCIADO` \| `VIUVO` \| `UNIAO_ESTAVEL`, opcional |
| `numeroAdultos` | integer | opcional |
| `criancasPequenas` | integer | opcional |
| `adolescentes` | integer | opcional |
| `doentes` | boolean | opcional |
| `bolsaFamilia` | boolean | opcional |
| `aposentado` | boolean | opcional |
| `pensao` | boolean | opcional |
| `cestaBasica` | boolean | opcional |
| `atividadeRemunerada` | boolean | opcional |
| `renda` | real | opcional |
| `criancaEscola` | boolean | opcional |
| `observacoes` | text | opcional |

> ⚠️ **LGPD:** esta tabela tem dados sensíveis. Nunca usar dados reais em
> desenvolvimento, demos ou vídeos — sempre mock.

### `donor`

| Coluna | Tipo | Obs |
|---|---|---|
| `id` | text PK | |
| `name` | text | |
| `telefone` | text | obrigatório, E.164 |
| `email` | text | opcional |
| endereço | mesmas 7 colunas de endereço do `beneficiary` | ViaCEP |

O `telefone`, o `bairro`, a `cidade` e a `uf` são `NOT NULL` nas duas
tabelas, e é o que o contrato exige: o zod em
[`src/schemas/api/beneficiary.ts`](../../src/schemas/api/beneficiary.ts) e
[`src/schemas/api/donor.ts`](../../src/schemas/api/donor.ts) recusa o
`POST` sem eles. O Drizzle segue o contrato, e não o contrário.

## Estoque: o ledger

O estoque é um **ledger de movimentos**. Cada linha é uma operação que mudou
quantidades, e o saldo é a soma delas. Não existe "linha de item" em nenhuma
tabela: `donation_line` e `delivery_line` saíram, e o conteúdo de uma doação ou
de uma entrega se lê no ledger filtrando por `ref_id`.

| Tabela | Colunas |
|---|---|
| `item_category` | `id` text PK, `name` text |
| `inventory_item` | `id` text PK, `name` text, `category_id` FK, `unit` text enum, `on_hand` integer default 0, `reserved` integer default 0, `available` integer **gerada** |
| `donation` | `id` text PK, `donor_id` FK → `donor.id`, `occurred_at` integer, `status` text, `note` text |
| `delivery` | `id` text PK, `beneficiary_id` FK → `beneficiary.id`, `occurred_at` integer, `status` text, `note` text |
| `ledger` | `seq` integer PK autoincrement, `id` text UNIQUE, `item_id` FK → `inventory_item.id`, `kind` text, `on_hand_delta` integer default 0, `reserved_delta` integer default 0, `counted_quantity` integer, `ref_id` text, `occurred_at` integer |
| `inventory_count` | `id` text PK, `occurred_at` integer, `counted_by` text, `note` text |
| `inventory_adjustment` | `id` text PK, `item_id` FK → `inventory_item.id`, `delta` integer, `reason` text enum, `occurred_at` integer |
| `reconciliation` | `id` text PK, `run_at` integer, `ok` boolean, `drifted_items` integer, `detail` text |

`unit` ∈ `KG`, `L`, `UNIT`, `PACK`, `BOX`. É o SI quando existe
(`KG`, `L`) e o termo em inglês quando não (`UNIT`, `PACK`, `BOX`); a tela traduz.
`status` de `donation` ∈ `RECEIVED`, `VOID`. `status` de `delivery` ∈ `OPEN`,
`COMPLETED`, `CANCELLED`. `kind` de `ledger` ∈ `COUNT`, `RECEIVE`, `RESERVE`,
`ISSUE`, `RELEASE`, `ADJUST`, `REVERSE`. `reason` de `inventory_adjustment` ∈
`STOCKTAKE`, `DONOR_RETURN`, `LOSS`, `DAMAGE`, `CORRECTION` — e o cliente só
envia os três do meio.

### O que cada movimento faz

| `kind` | `on_hand_delta` | `reserved_delta` | Quando |
|---|---|---|---|
| `COUNT` | `counted − saldo_do_ledger` | 0 | contagem física; re-baselineia |
| `RECEIVE` | `+q` | 0 | doação registrada |
| `RESERVE` | 0 | `+q` | entrega criada |
| `ISSUE` | `−q` | `−q` | entrega concluída |
| `RELEASE` | 0 | `−q` | entrega cancelada |
| `ADJUST` | `±q` | 0 | perda, dano, devolução |
| `REVERSE` | `−origem` | `−origem` | estorno de uma entrada |

`available` é `GENERATED ALWAYS AS ("on_hand" - "reserved") VIRTUAL`. Ninguém
escreve nela. A **guarda** não usa a coluna gerada, e sim a aritmética escrita à
mão (`on_hand - reserved >= ?`): uma coluna virtual dentro do `WHERE` de um
`UPDATE` muda de comportamento entre builds de SQLite.

### `ref_id` é uma referência polimórfica

`ledger.ref_id` aponta para o documento que originou o movimento, e o documento
depende do `kind`:

| `kind` | `ref_id` aponta para |
|---|---|
| `RECEIVE`, `REVERSE` de uma doação | `donation.id` |
| `RESERVE`, `ISSUE`, `RELEASE` | `delivery.id` |
| `COUNT` | `inventory_count.id` |
| `ADJUST` | `inventory_adjustment.id` |
| `REVERSE` | a entrada do ledger que está estornando (`ledger.id`) |

SQLite não tem FK polimórfica, então **`ref_id` não é uma constraint**. O `kind`
torna a linha autodescritiva, e a integridade é conferida por uma consulta — que
vira teste:

```sql
SELECT l.* FROM ledger l
 WHERE (l.kind IN ('RESERVE','ISSUE','RELEASE')
        AND NOT EXISTS (SELECT 1 FROM delivery d WHERE d.id = l.ref_id))
    OR (l.kind = 'RECEIVE'
        AND NOT EXISTS (SELECT 1 FROM donation n WHERE n.id = l.ref_id))
    OR (l.kind = 'COUNT'
        AND NOT EXISTS (SELECT 1 FROM inventory_count c WHERE c.id = l.ref_id))
    OR (l.kind = 'ADJUST'
        AND NOT EXISTS (SELECT 1 FROM inventory_adjustment a WHERE a.id = l.ref_id))
    OR (l.kind = 'REVERSE'
        AND NOT EXISTS (SELECT 1 FROM ledger o WHERE o.id = l.ref_id));
-- 0 linhas = todo movimento aponta para algo que existe
```

### As duas invariantes

O saldo é **derivado**, e por isso é verificável. Duas consultas provam que o
estado é coerente — e elas são o contrato inteiro do modelo:

**1. O cache bate com o ledger.**

```sql
SELECT l.item_id,
       SUM(l.on_hand_delta)   AS ledger_on_hand,
       SUM(l.reserved_delta) AS ledger_reserved,
       i.on_hand, i.reserved
  FROM ledger l JOIN inventory_item i ON i.id = l.item_id
 GROUP BY l.item_id
HAVING SUM(l.on_hand_delta)   <> i.on_hand
    OR SUM(l.reserved_delta)  <> i.reserved;
-- 0 linhas = o cache está certo
```

`on_hand` e `reserved` em `inventory_item` são **cache**, não fonte da verdade.
Eles existem para que a tela de estoque e a guarda do trigger leiam em O(1), e
são reconstruíveis a partir do ledger a qualquer momento.

**2. O estoque nunca overcommitou — em nenhum momento da história.**

```sql
SELECT COUNT(*) FROM (
  SELECT SUM(on_hand_delta) OVER w - SUM(reserved_delta) OVER w AS available
    FROM ledger WINDOW w AS (PARTITION BY item_id ORDER BY seq)
) WHERE available < 0;
-- 0 = o estoque nunca ficou negativo
```

A segunda é a mais forte das duas: ela olha a **história inteira**, e não o
estado final. Um contador não tem essa propriedade — só o ledger tem.

### A contagem re-baselineia

`COUNT` é o único movimento que **não** é um delta. Ele fixa `on_hand` no valor
contado, e o delta que ele carrega é calculado dentro do próprio statement, a
partir da soma do ledger:

```sql
INSERT INTO ledger (id, item_id, kind, on_hand_delta, counted_quantity, ref_id, occurred_at)
SELECT :id, :item_id, 'COUNT',
       :counted - COALESCE((SELECT SUM(on_hand_delta) FROM ledger WHERE item_id = :item_id), 0),
       :counted, :ref_id, :now;
```

Por isso a contagem **conserta a divergência** entre cache e ledger nos dois
lados de uma vez: depois dela, a soma do ledger e o cache valem `counted`.

### A guarda é um trigger do D1

A regra que impede overcommit ** mora no banco**, em um trigger que aborta a
escrita com uma mensagem utilizável:

```sql
CREATE TRIGGER ledger_guard BEFORE INSERT ON ledger
BEGIN
  SELECT RAISE(ABORT, 'INSUFFICIENT_STOCK')
   WHERE NEW.kind = 'RESERVE'
     AND (SELECT on_hand - reserved FROM inventory_item WHERE id = NEW.item_id)
         < NEW.reserved_delta;

  SELECT RAISE(ABORT, 'INSUFFICIENT_STOCK')
   WHERE NEW.kind = 'ISSUE'
     AND (SELECT on_hand FROM inventory_item WHERE id = NEW.item_id)
         < -NEW.on_hand_delta;

  SELECT RAISE(ABORT, 'INVALID_RELEASE')
   WHERE NEW.kind = 'RELEASE'
     AND (SELECT reserved FROM inventory_item WHERE id = NEW.item_id)
         < -NEW.reserved_delta;

  SELECT RAISE(ABORT, 'NEGATIVE_STOCK')
   WHERE NEW.kind IN ('ADJUST', 'COUNT', 'REVERSE')
     AND (SELECT on_hand FROM inventory_item WHERE id = NEW.item_id) + NEW.on_hand_delta
         < (SELECT reserved FROM inventory_item WHERE id = NEW.item_id) + NEW.reserved_delta;
END;
```

O `RAISE(ABORT, ...)` chega ao Worker como `SQLITE_CONSTRAINT_TRIGGER`, com a
mensagem intacta, e **reverte o lote inteiro**. Ver
[`api.md`](api.md#a-guarda-vive-no-banco).

O `REVERSE` entrou na guarda do `NEGATIVE_STOCK` porque o estorno de uma
doação **devolve** o estoque, e a devolução não pode passar do que ainda
está lá: uma doação já entregue não pode ser estornada, porque o `ISSUE` da
entrada já consumiu parte do que o `RECEIVE` tinha trazido. Sem essa regra, o
estorno levava o saldo abaixo de zero — e a segunda invariante, a que prova
que o estoque nunca overcommitou, deixava de valer.

### Índices

```sql
CREATE INDEX ledger_ref_idx  ON ledger(ref_id, kind, item_id);
CREATE INDEX ledger_item_idx ON ledger(item_id, seq);
```

O primeiro serve as consultas de documento ("o que tem nesta entrega"); o
segundo, a reconciliação e a leitura de saldo por item.

### `onDelete` é `no action` em tudo

Cancelar uma entrega **libera**, nunca cascateia. Apagar um item que tem
movimentações é recusado pelo `FOREIGN KEY` do D1.

## Seed

`bun run db-seed` gera o banco. O gerador **não sorteia saldo**: ele sorteia os
movimentos — doações, entregas, contagens, ajustes — e deriva o saldo, aplicando
cada movimento numa simulação em memória. O `inventory_item` é escrito no fim, com
o resultado. Isso faz o banco nascer consistente por construção, e não por
sorte.

Duas consequências: o gerador só sorteia uma entrega para item que tem
disponibilidade, então ele respeita a mesma guarda que a API; e ele **valida as
duas invariantes antes de devolver**, então um seed que produzisse drift falharia
em vez de escrever.

`mock_data/catalogo.json` lista os 130 itens com a `unit` de cada um. A categoria
`Alimentos` tem 16 itens com `KG` e `L` de verdade — sem ela o modelo de
quantidade não teria o que somar, porque as outras 8 categorias são quase tudo
`UNIT`.

## Migrations

```bash
drizzle-kit generate                                        # gera a migration
wrangler d1 migrations apply prod-sistema-doacoes-2 --local    # desenvolvimento
wrangler d1 migrations apply prod-sistema-doacoes-2 --remote   # produção
```

Detalhes em [`drizzle-migrations.md`](drizzle-migrations.md).
