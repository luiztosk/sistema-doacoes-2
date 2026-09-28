# Modelos do Banco de Dados (D1 + Drizzle ORM)

Este documento descreve o modelo de dados do sistema novo, traduzido do projeto
legado do PI I (Flask + SQLAlchemy + SQLite) e adaptado para a stack atual:
**Cloudflare D1 + Drizzle ORM + Better Auth**.

Fecha a issue #21 e serve de base para a implementação do schema (issue #11).

## Convenções

- Banco: Cloudflare D1 (SQLite). Tipos disponíveis: `text`, `integer`, `real`.
- IDs das tabelas de domínio: `text` (UUID), para ficar consistente com as
  tabelas do Better Auth (`user`, `organization`, `member`, `invitation`), que
  usam IDs em texto.
- **Toda tabela de domínio tem `organization_id`** (multi-tenancy — ver
  `docs/seguranca.md`). Nenhuma query pode ser feita sem esse filtro.
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

`user`, `session`, `account`, `organization`, `member` e `invitation` são geradas
pelo Better Auth + plugin Organization. Cada **instituição é uma `organization`**.
O schema completo delas está no guia de migração de auth; no Drizzle a gente só
referencia `organization.id` como FK.

## Tabelas de domínio

### `assistido`

Família/pessoa assistida pela instituição. No legado tinha campos socioeconômicos
detalhados (o diagrama antigo do README estava desatualizado — este é o modelo real).

| Coluna | Tipo | Obs |
|---|---|---|
| `id` | text PK | UUID |
| `organization_id` | text FK → organization.id | **obrigatório** |
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
| `valor_aluguel` | integer | centavos, opcional |
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
| `organization_id` | text FK | **obrigatório** |
| `nome` | text | |
| `telefone` | text | |
| `email` | text | opcional |
| endereço | mesmas 7 colunas de endereço do `assistido` | ViaCEP |

### `categoria_item` e `nome_item`

Catálogo de itens (ex.: categoria "Alimento", nome "Arroz 5kg").

| Tabela | Colunas |
|---|---|
| `categoria_item` | `id` text PK, `organization_id` FK, `nome` text |
| `nome_item` | `id` text PK, `organization_id` FK, `categoria_id` FK → categoria_item.id, `nome` text |

### `coleta` e `entrega`

Eventos de doação. `coleta` = doação recebida de um doador;
`entrega` = doação destinada a um assistido.

| Tabela | Colunas |
|---|---|
| `coleta` | `id` text PK, `organization_id` FK, `doador_id` FK → doador.id (**obrigatório**), `data_hora` timestamp |
| `entrega` | `id` text PK, `organization_id` FK, `assistido_id` FK → assistido.id (**obrigatório**), `data_hora` timestamp |

Sem doador ou sem assistido o evento não existe: uma coleta órfã não diz de quem
foi a doação, e uma entrega órfã não diz para quem foi.

### `item`

Item concreto que passa pelo estoque. É o coração do rastreio: cada item nasce
numa coleta e termina numa entrega.

| Coluna | Tipo | Obs |
|---|---|---|
| `id` | text PK | |
| `organization_id` | text FK | **obrigatório** |
| `nome_id` | text FK → nome_item.id | |
| `status` | text | `AGUARDA_COLETA` → `EM_ESTOQUE` → `ENTREGUE` |
| `coleta_id` | text FK → coleta.id | preenchido na coleta |
| `entrega_id` | text FK → entrega.id | preenchido na entrega |

Quem doou e quem recebeu **não** são colunas do `item`: saem da coleta e da
entrega (`item → coleta → doador`, `item → entrega → assistido`). Antes havia
uma cópia denormalizada de cada lado, e elas divergiam do evento de origem — nos
dados de mock, 12 dos 44 itens discordavam sobre o destinatário. Para listar
"itens recebidos por um assistido" a consulta faz o join pelas duas tabelas.

Regra de negócio do status (vem do legado):

```text
item criado (doação registrada)  → AGUARDA_COLETA
coleta registrada                → EM_ESTOQUE
entrega registrada               → ENTREGUE
```

## Regras de valor

As regras moram em um lugar só: o zod de `src/worker/db/schema.ts`, cada
`refinement` logo abaixo da tabela que ele julga. As regras viram `400` com o nome
do campo, não `409` do banco.

### Os `check()` foram removidos

O schema **teve** `check()` — 26 deles, em `efca2a7` — e não tem mais. A decisão
foi o contrário da intuição, e vale registrar o porquê:

- **A regra duplicada tem dois jeitos de falhar.** No `check()` a violação volta
  como `409 CONFLICT` genérico, com o nome da constraint dentro do texto do D1
  (`CHECK constraint failed: assistido_nome_nao_vazio`); no zod a mesma regra
  volta como `400 INVALID_VALUE` com o campo nomeado. Duas Copies da regra, dois
  formatos de erro, e o cliente termina tratando os dois.
- **O zod já cobria tudo que a API consegue julgar.** Nome em branco, `>= 0`,
  formato de CEP, as listas de `enum` e a regra entre `tipoImovel` e
  `valorAluguel` estão todas no `refinement`, com a mensagem escrita para o
  usuário final.
- **O que o zod não alcança, o banco continua fazendo.** A `FOREIGN KEY` e o
  índice único do catálogo são constraints de verdade — não há como reescrevê-las
  em TypeScript — e continuam no DDL. Referência e unicidade não foram
  removidas: só deixaram de ter uma segunda cópia em `check()`.

O preço, aceito: **escrita que não passa pela API não é filtrada.** D1 Studio e
scripts futuros podem gravar `renda: -500` ou nome em branco sem que nada
recuse. O seed é tratado como código confiável e foi validado em banco temporário.

A migration `20260928175253_overjoyed_lizard` reconstrói as tabelas no formato
atual, remove os `check()` legados, adiciona `organization_id` e migra os dados
anteriores para `org-1`. Ela foi validada tanto sobre um banco legado preenchido
quanto sobre um banco vazio.

O que o Drizzle emite e o que não emite importa para não confiar no schema duas
vezes:

| No schema | No DDL | No zod |
|---|---|---|
| `text("status", { enum: [...] })` | nada | `z.enum([...])` |
| `text("uf", { length: 2 })` | `text(2)` — afinidade, não constraint | `z.string()` |
| `integer("aposentado", { mode: "boolean" })` | `integer` | `z.boolean()` |
| `text("doador_id").references(doador.id)` | `FOREIGN KEY` | nada — e é o banco quem julga |

### O que é garantido

| Regra | Tabela | Onde |
|---|---|---|
| `nome` não vazio (`length(trim(nome)) > 0`) | `assistido`, `doador`, `categoria_item`, `nome_item` | `nomeNaoVazio` |
| `cep` com 8 dígitos, sem hífen (é o que o ViaCEP devolve) | `assistido`, `doador` | `cepDeEntrada`, `cepGuardado` |
| uma das 27 UFs | `assistido`, `doador` | `enum` da coluna |
| `ALUGADO` \| `PROPRIO` | `assistido` | `enum` da coluna |
| um dos 5 estados civis | `assistido` | `enum` da coluna |
| `renda >= 0` | `assistido` | `naoNegativo` |
| `valorAluguel >= 0` | `assistido` | `naoNegativo` |
| aluguel > 0 se `ALUGADO`, vazio se `PROPRIO` | `assistido` | `compatAluguelImovel` |
| contadores de pessoas ≥ 0 | `assistido` | `naoNegativo` |
| um dos 3 status | `item` | `enum` da coluna |
| referência existe e pertence ao tenant ativo | todas | `requireTenantReference`; `FOREIGN KEY` como proteção final |
| `ENTREGUE` ⇒ `entregaId` preenchido | `item` | `validateItem` (`DELIVERY_REQUIRED`) |
| `entregaId` ⇒ `coletaId` preenchido | `item` | `validateItem` (`COLLECTION_REQUIRED`) |
| `AGUARDA_COLETA → EM_ESTOQUE → ENTREGUE` | `item` | `validateItem` (`INVALID_STATUS_TRANSITION`) |

Antes de inserir ou alterar, a API consulta as referências usando também
`organization_id`. Isso evita tanto referências inexistentes quanto ligações
entre instituições. Nos `PATCH`, `validateAssistido` e `validateItem` combinam
o payload parcial com a linha atual, fechando as duas invariantes que dependem
de campos não enviados no pedido.

### Índices e `ON DELETE`

As tabelas de domínio não tinham índice nenhum além da PK, e o SQLite não cria
índice automático para FK. Os índices de acesso agora começam por
`organization_id`, seguido da coluna usada na tela: categoria, doador,
assistido, status, coleta ou entrega. Assim a mesma estrutura atende ao filtro
obrigatório do tenant e à busca funcional.

As 5 FKs de domínio declaram `on delete: "no action"` explicitamente: excluir um
doador que tem coleta estoura, e a API responde `409`. A mesma constraint é o que
recusa um `doador_id` que não existe, então é a única regra que o banco julga —
ver [Regras de valor](#regras-de-valor). Está escrito assim de propósito, para
não ficar implícito.

O catálogo também tem unicidade: `categoria_item_nome_uniq` e
`nome_item_nome_uniq`, os dois sobre `lower(nome)`, para que "arroz 5kg" e
"Arroz 5kg" contem como o mesmo nome. Um `UNIQUE` na coluna seria case-sensitive
(a collation padrão do SQLite é BINARY) e é constraint de tabela — que o SQLite
só consegue adicionar reconstruindo a tabela. Um índice sobre `lower(nome)` é um
`CREATE UNIQUE INDEX` e não mexe nos dados. ⚠️ O seed usa
`onConflictDoNothing()`. O seed agora avisa no console qual linha foi pulada por
conflito, em vez de ocultar a inconsistência.

### Triggers: não adicionados

Decisão registrada, não omissão. Os triggers foram avaliados e descartados:

- **Transição de status** (`AGUARDA_COLETA → EM_ESTOQUE → ENTREGUE`) já é
  validada em `validateItem` (`src/worker/api/v1.ts`), que responde `400`
  com o campo e a transição inválida. Um trigger seria uma segunda cópia
  independente da mesma regra, e o D1 levantaria a violação como erro de
  constraint genérico — resposta pior do que a de hoje, para o cliente.
- **Regras de valor** (`nome` em branco, `renda` negativa, `cep` fora de 8
  dígitos) dariam ao cliente exatamente a resposta que o trigger liftaria:
  `409` genérico, sem o campo. É a mesma razão que tirou o `check()` do schema —
  ver [Os `check()` foram removidos](#os-check-foram-removidos).
- **Uma das invariantes com dados sujos deixou de existir como possibilidade:**
  o destinatário vinha de uma coluna denormalizada no `item` que podia divergir
  da entrega (12 dos 44 itens divergiam). Com a coluna removida, o destinatário
  só tem uma fonte.

Se um dia o `db-seed` ou um script escrever direto no D1 precisar de uma regra
que o zod não alcança, o lugar certo é um trigger — e ele entra junto com um
mapeamento de erro, não sozinho.

### Pendente

- **Nome do campo na `INVALID_REFERENCE`.** A API já impede referência ausente
  ou cross-tenant, mas mantém a mensagem genérica para não duplicar o mesmo
  código para cada relacionamento.
- **CRUD do catálogo.** `categoria_item` e `nome_item` ainda dependem do seed;
  os endpoints dessas duas tabelas permanecem fora da issue #14.

### Feito: valores no zod

`createInsertSchema` da
[#42](https://github.com/luiztosk/sistema-doacoes-2/issues/42) infere de graça o
que a tabela já expressa — enum, boolean, required. O `refinement` cobre o que o
tipo não diz: `>= 0`, texto não vazio, formato de CEP, e a regra entre
`tipoImovel` e `valorAluguel`. Está em `src/worker/db/schema.ts`, cada
`refinement` logo abaixo da tabela que ele julga, ao lado dos três schemas que o
consumem — sem `check()` no banco e sem schema factory.

## Diagrama ER

```mermaid
erDiagram
  organization ||--o{ assistido : organization_id
  organization ||--o{ doador : organization_id
  organization ||--o{ coleta : organization_id
  organization ||--o{ entrega : organization_id
  organization ||--o{ item : organization_id
  categoria_item ||--o{ nome_item : categoria_id
  nome_item ||--o{ item : nome_id
  doador ||--o{ coleta : doador_id
  assistido ||--o{ entrega : assistido_id
  coleta ||--o{ item : coleta_id
  entrega ||--o{ item : entrega_id

  assistido {
    text id PK
    text organization_id FK
    text nome
    text telefone
    text cep
    text logradouro
    text numero
    text bairro
    text cidade
    text uf
    text tipo_imovel
    text estado_civil
    real renda
    text observacoes
  }

  doador {
    text id PK
    text organization_id FK
    text nome
    text telefone
    text cep
    text logradouro
    text numero
    text bairro
    text cidade
    text uf
  }

  item {
    text id PK
    text organization_id FK
    text nome_id FK
    text status
    text coleta_id FK
    text entrega_id FK
  }

  coleta {
    text id PK
    text organization_id FK
    text doador_id FK
    int data_hora
  }

  entrega {
    text id PK
    text organization_id FK
    text assistido_id FK
    int data_hora
  }
```

## Esboço do schema Drizzle (`src/db/schema.ts`)

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { organization } from "./auth-schema"; // gerado pelo Better Auth

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

const endereco = {
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  uf: text("uf", { enum: UFS }),
};

export const assistido = sqliteTable("assistido", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  email: text("email"),
  ...endereco,
  tipoImovel: text("tipo_imovel", { enum: ["ALUGADO", "PROPRIO"] }),
  valorAluguel: integer("valor_aluguel"),
  estadoCivil: text("estado_civil", {
    enum: ["SOLTEIRO", "CASADO", "DIVORCIADO", "VIUVO", "UNIAO_ESTAVEL"],
  }),
  numeroAdultos: integer("numero_adultos"),
  criancasPequenas: integer("criancas_pequenas"),
  adolescentes: integer("adolescentes"),
  doentes: integer("doentes", { mode: "boolean" }),
  bolsaFamilia: integer("bolsa_familia", { mode: "boolean" }),
  aposentado: integer("aposentado", { mode: "boolean" }),
  pensao: integer("pensao", { mode: "boolean" }),
  cestaBasica: integer("cesta_basica", { mode: "boolean" }),
  atividadeRemunerada: integer("atividade_remunerada", { mode: "boolean" }),
  renda: real("renda"),
  criancaEscola: integer("crianca_escola", { mode: "boolean" }),
  observacoes: text("observacoes"),
});

export const item = sqliteTable("item", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id),
  nomeId: text("nome_id").notNull(),
  status: text("status", {
    enum: ["AGUARDA_COLETA", "EM_ESTOQUE", "ENTREGUE"],
  })
    .notNull()
    .default("AGUARDA_COLETA"),
  coletaId: text("coleta_id"),
  entregaId: text("entrega_id"),
});

// doador, categoria_item, nome_item, coleta, entrega: mesmo padrão.
```

O esboço acima omite os `index()` das tabelas e os schemas de zod que julgam
cada uma — o arquivo real é `src/worker/db/schema.ts`.

## Migrations

```bash
npx drizzle-kit generate
wrangler d1 migrations apply sistema-doacoes-db --local   # desenvolvimento
wrangler d1 migrations apply sistema-doacoes-db --remote  # produção
```

## Diferenças em relação ao legado (PI I)

1. **Endereço separado** em 7 colunas (antes era um campo único `endereco`) —
   necessário para a integração com o ViaCEP (issue #16).
2. **`organization_id` em tudo** — o legado tinha `instituicao` como tabela
   comum; agora instituição = `organization` do Better Auth, com isolamento
   obrigatório por tenant.
3. **IDs em texto** em vez de inteiros — padrão do Better Auth.
4. **Sem tabelas `user`/`role` próprias** — autenticação e papéis ficam com o
   Better Auth (`member.role`: owner, admin, staff, viewer).
5. **Sem migração de dados reais** — os dados do legado são fictícios (mock);
   o seed novo pode ser gerado a partir dos JSONs de `mock_data/` do repo antigo.
6. **`item` sem `doador_id`/`assistido_id`** — o legado guardava uma cópia
   denormalizada do doador e do assistido no item. Quem doou e quem recebeu saem
   da coleta e da entrega; a cópia divergia do evento de origem.
