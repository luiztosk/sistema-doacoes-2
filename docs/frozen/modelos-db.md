# Modelos do Banco de Dados (D1 + Drizzle ORM)

> **O redesenho de estoque foi aplicado em 01/10/2026.** `coleta`, `entrega`,
> `item`, `nome_item` e `categoria_item` **não existem mais** — a migration
> `20261001222515_remarkable_wendell_rand` derruba as cinco, e o desenho está em
> [Estoque](#estoque). O desenho original, com as sete operações e a regra de
> idempotência, está em [`../future/README.md`](../future/README.md).
>
> `assistido` e `doador` **não** entram no redesenho agora: viram `beneficiary` e
> `donor` depois, para não colidir com a branch que está construindo a tela de
> doador. Enquanto isso, `donation.donor_id` aponta para `doador.id` e
> `delivery.beneficiary_id` para `assistido.id`.

> O schema e o banco estão alinhados, sem nenhum `check()` no DDL. O histórico —
> por que os 26 `check()` saíram e o que custou — está em
> [`api.md`](api.md#o-check-foi-removido-e-isso-é-visível-no-contrato).

Este documento descreve o modelo de dados do sistema novo, traduzido do projeto
legado do PI I (Flask + SQLAlchemy + SQLite) e adaptado para a stack atual:
**Cloudflare D1 + Drizzle ORM + Better Auth**.

Fecha a issue #21 e serve de base para a implementação do schema (issue #11).

## Convenções

- Banco: Cloudflare D1 (SQLite). Tipos disponíveis: `text`, `integer`, `real`.
- IDs das tabelas de domínio: `text` (UUID), para ficar consistente com as
  tabelas do Better Auth (`user`, `organization`, `member`, `invitation`), que
  usam IDs em texto.
- **Nenhuma tabela de domínio tem `organization_id`.** A coluna existiu e foi
  removida junto com a integração do Better Auth; volta com a
  [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13). Até lá nenhuma
  query filtra por instituição, e a API **não deve ser exposta com dados reais**
  — ver [`api.md`](api.md) e [`seguranca.md`](seguranca.md).
- Booleanos: `integer(..., { mode: "boolean" })` no Drizzle.
- Datas: `integer(..., { mode: "timestamp" })`.
- Enums: `text` com `enum` do Drizzle, que **só tipa o TypeScript** e não emite
  nada no DDL. A lista é a mesma que o zod recebe como `z.enum`, então o domínio
  é recusado na entrada da API e o banco aceita qualquer texto. Ver
  [Regras de valor](#regras-de-valor).
- `uf` também é um enum (as 27 unidades federativas), não um `text` de 2 letras:
  `text("uf", { length: 2 })` vira `text(2)`, que no SQLite é **afinidade de
  tipo**, não constraint, e o D1 aceitaria `abc`.

## Tabelas de autenticação (Better Auth — não criar manualmente)

`user`, `session`, `account`, `organization`, `member`, `invitation` e
`verification` são geradas pelo Better Auth + plugin Organization. Cada
**instituição é uma `organization`**. Hoje nenhuma tabela de domínio referencia
`organization.id` — a coluna que faria essa ligação foi removida
([#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13)).

## Tabelas de domínio

### `assistido`

Família/pessoa assistida pela instituição. No legado tinha campos socioeconômicos
detalhados (o diagrama antigo do README estava desatualizado — este é o modelo real).

| Coluna | Tipo | Obs |
|---|---|---|
| `id` | text PK | UUID |
| `nome` | text | |
| `telefone` | text | |
| `email` | text | opcional |
| `cep` | text | preenchido via ViaCEP |
| `logradouro` | text | ViaCEP |
| `numero` | text | manual |
| `complemento` | text | opcional |
| `bairro` | text | ViaCEP |
| `cidade` | text | ViaCEP |
| `uf` | text | sigla de UF, enum das 27, opcional |
| `tipo_imovel` | text | `ALUGADO` \| `PROPRIO`, opcional |
| `valor_aluguel` | integer | em reais, opcional |
| `estado_civil` | text | `SOLTEIRO` \| `CASADO` \| `DIVORCIADO` \| `VIUVO` \| `UNIAO_ESTAVEL`, opcional |
| `numero_adultos` | integer | opcional |
| `criancas_pequenas` | integer | opcional |
| `adolescentes` | integer | opcional |
| `doentes` | boolean | opcional |
| `bolsa_familia` | boolean | opcional |
| `aposentado` | boolean | opcional |
| `pensao` | boolean | opcional |
| `cesta_basica` | boolean | opcional |
| `atividade_remunerada` | boolean | opcional |
| `renda` | real | opcional |
| `crianca_escola` | boolean | opcional |
| `observacoes` | text | opcional |

> ⚠️ **LGPD:** esta tabela tem dados sensíveis. Nunca usar dados reais em
> desenvolvimento, demos ou vídeos — sempre mock.

### `doador`

| Coluna | Tipo | Obs |
|---|---|---|
| `id` | text PK | |
| `nome` | text | |
| `telefone` | text | |
| `email` | text | opcional |
| endereço | mesmas 7 colunas de endereço do `assistido` | ViaCEP |

## Estoque

O modelo que substituiu `item`/`coleta`/`entrega`. O desenho completo, com as
sete operações e a regra de idempotência, está em
[`../future/README.md`](../future/README.md); aqui é a forma das tabelas.

| Tabela | Colunas |
|---|---|
| `item_category` | `id` text PK, `name` text |
| `inventory_item` | `id` text PK, `name` text, `category_id` FK, `unit` text enum, `on_hand` integer default 0, `reserved_quantity` integer default 0, `available` integer **gerada** |
| `donation` | `id` text PK, `donor_id` FK → `doador.id`, `occurred_at` integer, `status` text default `DRAFT`, `note` text |
| `donation_line` | PK (`donation_id`, `inventory_item_id`), `quantity` integer |
| `delivery` | `id` text PK, `beneficiary_id` FK → `assistido.id`, `occurred_at` integer, `status` text default `OPEN`, `note` text |
| `delivery_line` | PK (`delivery_id`, `inventory_item_id`), `quantity` integer |
| `inventory_count` | `id` text PK, `occurred_at` integer, `counted_by` text, `note` text |
| `inventory_count_line` | PK (`count_id`, `inventory_item_id`), `counted_quantity` integer |
| `inventory_adjustment` | `id` text PK, `inventory_item_id` FK, `delta` integer, `reason` text enum, `occurred_at` integer, `count_id` FK |

`unit` ∈ `KG`, `L`, `UNIT`, `PACK`, `BOX`. É o SI quando existe
(`KG`, `L`) e o termo em inglês quando não (`UNIT`, `PACK`, `BOX`); a tela traduz. `status` de `donation` ∈ `DRAFT`,
`RECEIVED`. `status` de `delivery` ∈ `OPEN`, `COMPLETED`, `CANCELLED`. `reason` ∈
`STOCKTAKE`, `DONOR_RETURN`, `LOSS`, `DAMAGE`, `CORRECTION` — e o cliente só
envia os três do meio.

`available` é `GENERATED ALWAYS AS ("on_hand" - "reserved_quantity") VIRTUAL`.
Ninguém escreve nela, e o zod não a expõe no insert nem no update. A **guarda da
reserva** não usa a coluna gerada, e sim a aritmética escrita à mão
(`on_hand - reserved_quantity >= ?`): uma coluna virtual dentro do `WHERE` de um
`UPDATE` muda de comportamento entre builds de SQLite.

`on_hand` e `reserved_quantity` são reconstruíveis, e por isso são verificáveis:

```
reserved_quantity = SUM(delivery_line) JOIN delivery WHERE status = 'OPEN'

on_hand = SUM(donation_line)  JOIN donation  WHERE status = 'RECEIVED'
         - SUM(delivery_line) JOIN delivery  WHERE status = 'COMPLETED'
         + SUM(inventory_adjustment.delta)
```

Essas duas fórmulas são as invariantes que
[`tests/inventory.ts`](../../tests/inventory.ts) verifica depois de cada uma das
sete operações. Detalhe em [`../arquitetura.md`](../arquitetura.md).

`donation.donor_id` e `delivery.beneficiary_id` são `NOT NULL`: a doação
conciliatória deixou de existir porque o ajuste ficou simétrico e absorveu os dois
sentidos. Todo `onDelete` é `no action` — cancelar uma entrega **libera**, nunca
cascateia.

`nome_item` e `categoria_item` **sumiram** de propósito: `inventory_item.name` é
`UNIQUE` sobre `lower(name)` e absorveu o catálogo de nomes, porque a linha da
doação já carrega o nome. A deduplicação continua acontecendo, na camada certa —
e `item_category` guarda só o agrupamento.

## Seed

`npm run db-seed` gera as 11 tabelas. Os dois contadores **não são sorteados**:
o gerador percorre as doações, as entregas, as contagens e os ajustes na ordem,
aplicando cada movimento numa simulação em memória, e só depois escreve
`inventory_item` com o resultado. Isso faz o banco nascer consistente por
construção, e não por sorte — o que era a raiz da
[#44](https://github.com/luiztosk/sistema-doacoes-2/issues/44).

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
npx drizzle-kit generate                                        # gera a migration
wrangler d1 migrations apply prod-sistema-doacoes-2 --local    # desenvolvimento
wrangler d1 migrations apply prod-sistema-doacoes-2 --remote   # produção
```

Detalhes em [`drizzle-migrations.md`](drizzle-migrations.md).
