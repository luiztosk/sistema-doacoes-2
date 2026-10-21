# Arquitetura do Sistema

Registro das decisões técnicas do PI II. Última atualização: 28/09/2026.

## Stack definida

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | SPA que consome a API; HMR rápido no desenvolvimento |
| Backend / API | Hono | Leve, feito para edge, integrado ao Cloudflare Workers; sintaxe parecida com Express |
| Contrato da API | `@hono/zod-openapi` + `openapi-typescript` | O `openapi.json` é gerado do zod e vira o tipo do cliente; um contrato só |
| Cliente da API | `openapi-fetch` + `openapi-react-query` | O tipo da resposta vem do `openapi.json`; não há tipo duplicado à mão |
| Hospedagem | Cloudflare Workers | Deploy global, escala automática, sem servidor para gerenciar |
| Banco de dados | Cloudflare D1 (SQLite no edge) | Nativo do Workers, gerenciado via Drizzle ORM |
| ORM | Drizzle ORM + drizzle-kit | Type-safe, gera migrations SQL |
| Formulários | TanStack Form | Estado do formulário é o payload; valida com o mesmo schema da API |
| Tabelas | TanStack Table v9 | Ordenação, filtro e paginação; `aria-sort` é nosso |
| Autenticação | Better Auth | Cuida de sessão, CSRF e senhas |
| Testes | `bun run test` (automatizados) + `bun run test:inventory` (o ledger, contra o D1 local) | Testes automatizados são requisito do tema do PI II |
| Controle de versão | Git + GitHub | Branch `main` protegida; trabalho via feature branches + PR |
| Gerenciador de pacotes | bun | Um lockfile só (`bun.lock`); o `npm ci` não instalava o repo, por causa do peer do TypeScript 6 |

> Next.js foi considerado e descartado em favor do Hono, que é mais leve e mais
> integrado ao ecossistema do Cloudflare Workers.

## Fluxo de deploy (já configurado)

- O Cloudflare Workers está integrado ao GitHub: **todo commit na `main` dispara
  build e deploy automáticos** (por isso a `main` é protegida — só recebe PR).
- Todo push para uma branch que não seja a `main` também dispara um build e gera
  uma **preview URL**, postada como comentário no Pull Request. É esse link que
  permite testar antes do merge.
- Protótipo no ar: <https://sd2.tosk.dev>

### Atenção: a preview usa os recursos de produção

A preview roda com as mesmas *bindings* da produção, ou seja, no mesmo banco
`prod-sistema-doacoes-2`. **Testar manualmente pela preview URL escreve no banco
de produção.** Hoje esse banco só tem dado de seed, e `bun run db-seed` recria
tudo, então o risco é baixo — mas não é um ambiente isolado. Se algum dia
precisarmos de um banco separado para testes, o caminho é migrar para Worker
Previews (isolamento por branch) ou criar um `env` de staging no `wrangler.jsonc`.

### O que roda a cada build

O Cloudflare executa o script `build` do `package.json`, que hoje é:

```
bun run lint && tsc -b && bun run test && vite build
```

O `&&` faz o build parar no primeiro erro: um problema de lint **impede o
deploy**. Esse build também reporta um status check no GitHub, e a `main`
exige que ele passe — ou seja, um merge com lint quebrado não entra.

> ✅ **O `bun run test` está no gate desde 20/10/2026**, com o ledger. Um
> teste vermelho agora bloqueia o deploy, como a cadeia sempre prometeu. A
> suíte do ledger (`bun run test:inventory`) **não** está no gate: ela precisa
> do D1 local semeado, e o CI não tem esse estado.

Como esse gate é automático, ele também bloqueia o merge por motivos que não são
código: cota de build esgotada, token de API inválido ou timeout de 20 min. Se
a `main` ficar travada sem erro de código, checar o histórico de builds no
dashboard antes de suspeitar do repositório.

## Fluxo de contribuição

1. Criar uma feature branch a partir da `main`
   - `main` é a **única** branch de longa vida. `dev` e `stage` existiram e foram
     abandonadas (set/2026 e ago/2026) — não criar de novo.
2. Commits pequenos e descritivos
3. Abrir o Pull Request cedo, pode ser como *draft*, só para pegar a preview URL
4. Fazer os testes manuais naquela preview URL, em lote
5. Mergear quando o check passar; o deploy acontece sozinho

### Duas camadas de teste

| Camada | Comando | Quando |
|---|---|---|
| Automatizada | `bun run lint`, `bun run test` | A cada push, via build do Cloudflare |
| Manual | O dev server, no navegador | Em lote, sobre a preview URL do PR |

Automatizada roda sempre porque custa segundos. Manual é em lote porque custa
minutos — mas nunca reste a testes automatizados, que são justamente o que
mantém um lote longo confiável.

### Uma terceira camada, que só roda com banco

`bun run test` roda contra um **stub em memória**: o D1 é substituído por um objeto
que devolve as linhas que o caso declara e falha como o D1 falha quando o caso
pede. Ele é rápido e determinístico, mas não tem estado — não sabe o que uma
requisição anterior fez, e não executa `db.batch()` de verdade.

O modelo de estoque depende justamente do que o stub não tem: o saldo de cada
item só faz sentido como resultado de uma sequência de operações sobre o mesmo
banco, e a guarda mora num trigger do D1. Por isso existe uma segunda suíte:

```bash
bun run db-reset         # banco do zero: apaga, aplica, e semeia
bun run test:inventory   # as 7 operações do estoque, contra o D1 local
```

[`tests/inventory.ts`](../tests/inventory.ts) cria as categorias e os itens,
roda as sete operações na ordem — `RECEIVE`, `RESERVE`, `ISSUE`, `RELEASE`,
`REVERSE`, `COUNT` e `ADJUST` — e **verifica as duas invariantes** depois de
cada passo:

```
o cache bate com o ledger
o estoque nunca overcommitou, em nenhum momento da história
```

As duas consultas estão em
[`frozen/modelos-db.md`](frozen/modelos-db.md#as-duas-invariantes), e a suíte
as roda de verdade, no D1 local. Ela também confere a integridade do `ref_id` —
que não é uma FK, e por isso é uma consulta — e que todo id gravado no banco
está em minúsculo, porque `crypto.randomUUID()` devolve minúsculo e
`fake(z.uuidv4())` devolve maiúsculo — e o `.uuid()` do zod aceita os dois,
então essa diferença ficaria invisível até alguém colar um id do seed numa
chamada.

Ela **não entra no gate de build**, porque precisa de um banco local com as
migrations aplicadas: quem roda é a pessoa, com `bun run db-reset` antes.
Isso é o mesmo arranjo da verificação manual no navegador, e a razão é a
mesma — o stub não tem ciclo de vida. As asserções que o stub consegue fazer (código de
erro, status, mensagem, validação) ficam em `bun run test`; a aritmética do ledger
fica aqui.

O script é autossanável: as linhas que ele cria são ancoradas em nomes
(`check-item-%`, `check-categoria-%`, `note = 'check'`) e apagadas no começo e no
fim, de forma que uma execução interrompida não envenena a seguinte.

## Dados de demonstração

Não há mais CSV em `mock_data/`. O seed gera os dados a partir dos schemas do
contrato: `scripts/generate.ts` gera e valida cada linha contra o schema do
recurso antes de devolvê-la, e `scripts/seed.ts` insere. O gerador é
determinístico (`seed(42)`), então o mesmo `bun run db-seed` produz sempre as
mesmas linhas.

O gerador do ledger **não sorteia saldo**: ele sorteia os **movimentos** — doações,
entregas, contagens, ajustes — e deriva o saldo, aplicando cada movimento numa
simulação em memória. O `inventory_item` é escrito no fim, com o resultado. E o
seed escreve os movimentos **na mesma ordem que a API** — a entrada no ledger e,
logo depois, o saldo — porque a guarda mora no trigger, e o trigger lê o saldo do
item.

O que o gerador não faz: referência cruzada e ordem de evento. `faker` não tem
modo relacional, então `createDonations` recebe as linhas já criadas e a ordem
entre as tabelas é escrita à mão.

Para virar o gerador em dado novo, mexa só em `ROWS_PER_TABLE` e na função
`create*` da tabela.

## O contrato da API vem primeiro

> Decidido em 19/10/2026. O contrato da API é escrito em **zod, à mão**, em
> `src/schemas/api/` — e é a fonte da verdade. O banco é a implementação.
> O `openapi.json` é o formato publicado, e é **gerado** do zod.

### O que era

O zod do contrato era **gerado da tabela** (`createSelectSchema(table)`, do
`drizzle-orm/zod`). O contrato da API era, por consequência, **um despejo do
banco**, e três coisas quebraram:

1. **A lista carregava a linha inteira.** `GET /api/v1/beneficiaries` devolvia
   as 26 colunas — incluindo `cep`, `logradouro`, `numero`, `complemento`,
   `bairro`, `cidade`, `uf` e `observacoes` — para **cada** linha. O frontend
   compensava com um `Pick` no cliente, mas **o servidor mandava o endereço**.
2. **Um rename de coluna quebrou a API.** `assistido` → `beneficiary` renomeou
   `nome` → `name`: uma decisão de banco virou uma quebra de API.
3. **A API do ledger não tem tabela.** `GET /stock` é um agregado; o corpo do
   `POST /donations` tem uma lista de itens que não é tabela nenhuma; e
   `onHand`/`reserved` são cache, enquanto `available` é gerada. **Nenhum
   schema derivado de uma tabela expressa qualquer um desses.**

### O que é

```
src/schemas/api/       zod, escrito à mão. O que a API promete.
  ├─ <recurso>Schema          a resposta do detalhe
  ├─ <recurso>ListSchema      a linha da LISTA (estreita)
  ├─ <recurso>CreateSchema    o corpo do POST
  ├─ <recurso>UpdateSchema    o corpo do PATCH
  └─ <recurso>ListQuerySchema os query params
src/schemas/db/        Drizzle. O que a tabela guarda.
```

**A regra, em uma linha: o schema do contrato é o que o endpoint devolve; o
schema da tabela é o que a tabela guarda. São duas perguntas, e a resposta de
uma não decide a outra.**

Os enums moram no contrato (`src/schemas/api/enums.ts`) e o `src/schemas/db/`
**importa** de lá: o vocabulário é do contrato, e a tabela segue.

### O que isso permite

- **A lista e o detalhe têm formatos diferentes.** `beneficiaryListSchema` tem
  9 campos e `beneficiarySchema` tem 26 — e a validação da resposta
  **reprova** a lista se ela vier com endereço. Durante a implementação, ela
  reprovou de verdade: as listas de beneficiário, doador e ajuste estavam
  selecionando todas as colunas.
- **A API tem vida própria.** Renomear uma coluna não é mais uma quebra de
  contrato.
- **O contrato existe antes do backend.** `src/schemas/api/` é a documentação
  da API, e ela é escrita antes das tabelas existirem.

### O que custou

- **Um mapeamento.** O schema do contrato e o da tabela não são o mesmo
  objeto, então existe a tradução — no mesmo arquivo, para o leitor não ter que
  caçar.
- **O seed mudou de validação.** Ele validava cada linha contra o
  `*SelectSchema`, que era gerado da tabela. Agora valida contra o **schema do
  contrato**, e escreve direto no banco — passá-lo pela API continua sendo a
  decisão pendente, e é melhor: a validação passaria a ser a do contrato e o
  ledger nunca nasceria inconsistente.
- **Dois lugares com zod, por enquanto.** `src/schemas/api/` é o contrato; o
  `drizzle-orm/zod` saiu, e o `src/schemas/zod/` — que gerava schema a partir
  da tabela — saiu em 20/10/2026, com a migração das rotas. O que sobrou foi o
  frontend, que migrou no dia seguinte.

### O zod faz o quê, exatamente

Duas coisas, e as duas importam:

- **Validar o que entra.** O corpo do `POST` e do `PATCH`, e os query params.
- **Validar o que sai.** A resposta. E aqui o `.strict()` importa: um schema
  de resposta que **rejeita** campo a mais é o que pega a lista carregando
  endereço. Sem `.strict()`, o zod *descarta* o campo e o bug passa.

As mensagens dos campos são **em português**, para o formulário, e a API
responde em inglês porque o `errorFromIssue` reconstrói a frase a partir do
`issue.code` — **menos** no ramo `"custom"`, que é o que `.refine()` produz.
Por isso **nenhum schema de contrato usa `.refine()`**: regra que atravessa
dois campos vai no handler, com `apiError(...)` e frase em inglês.

`occurredAt` viaja como **ISO 8601 com fuso** (`z.iso.datetime({ offset: true })`),
e vira `Date` na rota. A alternativa, `z.coerce.date()`, aceitaria data sem
fuso — que é ambígua.

### O formato do contrato é OpenAPI 3.1

O `openapi.json` é o formato publicado, e ele é **gerado** do zod — nunca
escrito à mão. O zod v4 tem conversão nativa para JSON Schema, e
`draft-2020-12` é o dialeto do OpenAPI 3.1.

O `openapi.json` de hoje tem **zero** schemas nomeados: tudo inline. Com o
registro no `openAPIRegistry`, o documento passa a ter `components.schemas` e
as rotas passam a referenciar por `$ref`:

```ts
const Beneficiary = app.openAPIRegistry.register("Beneficiary", beneficiarySchema);
```

O `openapi.json` é gerado por `bun run update-openapi`, que **monta o app e
chama `app.getOpenAPI31Document(...)` direto** — sem servidor, sem rede, sem
porta. O `src/auth.config.ts` importa `cloudflare:workers` e não roda fora do
runtime do Worker, então o gerador importa `src/worker/app.ts` e
`src/worker/routes/index.ts`, e não o `index.ts`: o app e as rotas são o
contrato, e o `index.ts` é a montagem (middleware, sessão, tratamento de
erro). O CI pode conferir que o arquivo commitado está em dia.

## O modelo de estoque virou ledger

> Decidido em 19/10/2026, implementado na branch `mess/but-in-a-good-way` em
> 20/10/2026 (a API) e 21/10/2026 (o frontend). O contrato novo está em
> [`frozen/modelos-db.md`](frozen/modelos-db.md) e
> [`frozen/api.md`](frozen/api.md); o modelo anterior, em
> [`future/README.md`](future/README.md), é leitura histórica.

### O que era

O estoque era **dois contadores** em `inventory_item` — `on_hand` e
`reserved_quantity` — mais uma coluna gerada `available`, e tabelas de linha
(`donation_line`, `delivery_line`) ligando documento e item. Toda operação
mexia nos contadores, e o desenho tinha uma assimetria que ele mesmo
documentava: a reserva de uma entrega era **compensação**, não transação.
`db.batch()` é transação contra **erro**, não contra *statement que mudou zero
linhas* — então reservar era "escreve, confere, compensa", e a compensação
precisava **desfazer o contador**, não só apagar a linha. Uma falha no meio
deixava o `reserved_quantity` maior do que a soma das reservas abertas, e
**nada detectava isso**.

### O que é

O estoque é um **ledger de movimentos**. Cada linha é uma operação que mudou
quantidades, e o saldo é a soma delas:

```
ledger(seq, id, item_id, kind, on_hand_delta, reserved_delta, ref_id, occurred_at)
```

O saldo em `inventory_item` vira **cache** — reconstruível, verificável, e
rebuildável a qualquer momento.

### Por que

Três motivos, em ordem de peso:

1. **O contador era frágil porque não tinha o que reconciliá-lo.** Com o
   ledger, `SUM(deltas) == saldo` é uma consulta, e a reconciliação diária
   roda. A segunda invariante é mais forte ainda: prova que o estoque **nunca**
   overcommitou, em nenhum momento da história — coisa que um contador não
   consegue dizer.
2. **A guarda ficou no banco.** O `trigger ledger_guard` aborta a escrita com
   `RAISE(ABORT, 'INSUFFICIENT_STOCK')`, que o D1 devolve como
   `SQLITE_CONSTRAINT_TRIGGER` com a mensagem intacta, e o lote inteiro reverte.
   A regra que impede overcommit não é código da aplicação, e não tem como
   ser contornada por um caminho que esqueça de chamar a função.
3. **A tabela encolheu.** O ledger grava ~1 linha por movimentação, contra N do
   modelo por unidade. E o saldo se lê em O(itens), não em O(unidades).

### O que custou

- A camada de erro ganhou um ramo: sem traduzir `SQLITE_CONSTRAINT_TRIGGER`, a
  guarda vira `500` e o cliente perde o motivo.
- O `POST /donations/:id/receive` saiu, e `DELETE` em documento com
  movimentações saiu: o caminho é estornar.
- A tela do ledger é a **primeira com paginação no servidor** do app, porque é
  a única tabela que cresce sem limite. Ela usa um `ServerPagination` próprio,
  dirigido pela URL, e não o `TablePagination`, que conta as linhas do cliente.
- O conteúdo de um documento passou a ser **fixo na criação**. Editar é
  estornar e recriar — e a tela mostra isso: a lista de itens do formulário é
  editável só na criação.
- O **frontend inteiro** foi migrado para o contrato: os schemas, o envelope
  `{ data }`, o `itemId`, a data em ISO 8601 e a lista de itens. O
  `src/schemas/zod/`, que era gerado da tabela, saiu.

### O que a medição no D1 mudou

Os limites do plano Free, conferidos na documentação da Cloudflare (abr/2026):
**5 milhões de linhas lidas por dia**, **100 mil linhas escritas por dia**,
**500 MB por banco**, e **50 queries por invocação**. Rows read contam linhas
**escaneadas**, não devolvidas, e cada coluna indexada escreve uma linha a
mais. No Free os limites são **corte duro**: a instância para até 00:00 UTC.

Duas medições de projeto mudaram o desenho:

- **O modelo por unidade cabia no limite, e mesmo assim não foi escolhido.**
  Com 5.000 unidades em estoque e 15 pessoas usando o sistema, a tela de
  estoque sozinha consumiria 45% do orçamento diário de leitura — e o
  orçamento é queimado pelo *padrão de leitura*, não pelo volume de dados.
- **A entrega por unidade cabia num statement só.** Reservar N itens é um
  `UPDATE` com o guard no mesmo `WHERE`, o que elimina o teto de "uns 45 itens
  por entrega" que o modelo de contadores tinha.

### A reconciliação

Cron diário no Worker. Ela confere o cache contra o ledger, roda a invariante
histórica, e **avisa sem bloquear** quando acha divergência — a instituição não
para de entregar por causa de bookkeeping. O reparo é reconstruir o cache a
partir do ledger, que é seguro porque o cache é derivado. Detalhes em
[`frozen/api.md`](frozen/api.md#a-reconciliação-é-a-segunda-camada-de-segurança).
