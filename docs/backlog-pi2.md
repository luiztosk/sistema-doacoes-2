# Backlog técnico — PI II

O que falta **neste trimestre**, e o que já está resolvido. Os itens que não
dependem deste trimestre estão em [`future/`](future/README.md) e
[`frozen/`](frozen/README.md).

Estado conferido em 05/10/2026.

## Cobertura dos requisitos do tema

| Requisito | Status | Onde/como |
|---|---|---|
| Framework web | ✅ | Hono (backend) + React (frontend) |
| Banco de dados | ✅ | D1 + Drizzle, 7 tabelas. O backend está congelado nesta rodada |
| JavaScript/TypeScript | ✅ | Todo o código novo é TS, com `strict` e `noUnusedLocals` |
| Hospedagem em nuvem | ✅ | Cloudflare Workers, deploy automático na `main` |
| Controle de versão | ✅ | Git + GitHub + PRs, `main` protegida por status check |
| Testes | ✅ | `npm test` (`tsx tests/api.ts`, 28 casos da API) + Insomnia (manual) |
| Consumo de API externa | ⏳ | ViaCEP — ver [`future/`](future/README.md) |
| Acessibilidade | ⏳ | Parcial: `label` associado e foco visível nas telas; falta teste com axe |

## O que falta fazer

1. ✅ **Banco e API** — as 7 tabelas e os 25 endpoints existem. A tabela
   `instituicao` não foi criada de propósito: instituição é a `organization` do
   Better Auth.
2. ✅ **Autenticação** — Better Auth com plugin Organization, login e cadastro
   funcionando.
3. ⏳ **As telas dos outros recursos** — `assistido` é a referência e está nos
   três modos (`/assistidos`, `/assistidos/novo`, `/assistidos/id/$id`).
   `doador` também está nos três modos (`/doadores`, `/doadores/novo`,
   `/doadores/id/$id`), com os 10 campos de identificação e endereço. Vale o
   aviso do item 9: `doador` vira `donor` no redesenho do estoque, então a tela
   nasce com o nome que vai morrer — mas já existe.
   `coleta`, `entrega` e `item` **não ganham tela porque saíram do banco**: o
   modelo de estoque já foi decidido (`inventory_item`, `donation`, `delivery`,
   reserva e ajuste) e implementado nesta branch, em
   [`future/README.md`](future/README.md). As receitas estão em
   [`frontend-tabela.md`](frontend-tabela.md) e
   [`frontend-formulario.md`](frontend-formulario.md). Busca, ordenação e
   paginação já estão nas tabelas de `assistido` e `doador`, reutilizando
   `components/tables/table-*.ts(x)`. Doadores também têm filtro por UF;
   página e ordenação ficam na URL e são preservadas ao voltar do detalhe.
4. ⛔ **Coluna "cadastrado em"** — `assistido` não tem nenhuma coluna de data,
   nenhuma das 26. Ordenar por mais recentes e mostrar quando a pessoa foi
   cadastrada depende de uma coluna que o backend congelado não tem, então não
   foi inventada e a ordenação padrão ficou em `nome.asc`. Quando o backend for
   destravado: coluna com default no banco, migration, e `generate.ts`
   produzindo datas em ordem — senão "mais recentes primeiro" sobre o seed
   ordena linhas que nasceram no mesmo instante. A troca na tela é uma linha, o
   `initialSort` de `table-view-state.ts`.
5. ⏳ **Erro de mutation na tela** — hoje o `MutationCache` em
   `lib/query-client.ts` joga no `console` e não há `Alert`, `toast` nem
   `errorMap` por campo para falha de servidor. As mensagens do zod em
   `schema.ts` cobrem validação de campo, mas a API responde em inglês via
   `errors.ts`. O `catch` do `onSubmit` já segura a navegação; falta mostrar a
   mensagem.
6. ⏳ **Fluxo de convite por link** — admin convita, usuário aceita e entra na
   organização. Depende do item 7.
7. ❌ **Multi-tenancy** — **é o buraco mais importante.** Falta a coluna
   `organization_id` nas tabelas de domínio e o middleware que filtra as
   queries. Rastreado pela
   [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13). Enquanto não
   existir, a API não deve receber dados reais. Não implementado nesta rodada:
   ver [`future/`](future/README.md).
8. ⏳ **Redesenho do estoque** — o modelo está decidido e escrito por inteiro em
   [`future/README.md`](future/README.md), e **não está implementado na `main`**:
   as tabelas de lá continuam `coleta`, `entrega` e `item`. Nesta branch (`feat/redesenho-estoque`) a implementação já entrou: `coleta`/`entrega`/`item` saíram do banco e viraram `donation`/`delivery`/`inventory_item`. A branch está liberada do congelamento. As três dúvidas que o desenho tinha sobre o D1 foram medidas localmente, e as três passaram:

   | Dúvida | Resultado |
   |---|---|
   | Coluna gerada `VIRTUAL` | funciona — o valor é calculado, a escrita é recusada no `INSERT` e no `UPDATE`, e recalcula a cada `UPDATE` |
   | `json_each` | existe |
   | `ON CONFLICT` sobre índice único de expressão | funciona, e a dedup por `lower()` vale |

   Consequência: criar N itens numa doação custa **2 statements**, e não 2 por
   linha. O `WHERE true` é obrigatório —
   `INSERT ... SELECT ... FROM json_each(...) WHERE true ON CONFLICT DO NOTHING` —
   porque sem ele o parser do SQLite não distingue o `ON` do upsert do `ON` de join
   e o statement nem compila (`near "DO": syntax error`).

   E o `db.batch()` devolve um `D1Result` por statement, na ordem, cada um com o seu
   `meta.changes`: uma reserva em que só dois dos três itens tinham estoque devolveu
   `[1, 0, 1]`. O `results[i].meta.changes === 0` do desenho funciona como está
   escrito. `RETURNING` também é aceito pelo D1, como sinal independente.

   **O que segue sem confirmação:** o teto de 50 queries por invocação no plano Free
   é limite de plataforma e só dá para medir no remoto. Com o custo por entrega em
   2N, é ele que corta os "~45 itens distintos por entrega".

   Uma ressalva: a recusa de escrita na coluna gerada sai como `SQLITE_ERROR` cru,
   que o `handleApiError` não traduz — a mesma classe do `CHECK constraint failed`.
   Não é problema enquanto ninguém escreve nela.

   O próximo passo é a migration, e ela carrega **o rename das 7 tabelas**:
   `assistido` vira `beneficiary` e `doador` vira `donor`, junto com
   `coleta`/`entrega`/`item`. Isso toca a tela de `assistido`, já mergeada, e a de
   `doador`, que é a próxima da lista. Ainda não está decidido se o rename entra na
   mesma migration do estoque ou se vira migration própria.

### O que já está feito na branch

1. **As 9 tabelas novas** no `schema.ts`, com migration, e o DDL do drizzle
   conferido contra o D1 real.
2. **As sete operações** em `src/worker/api/stock.ts`, com o SQL do
   `future/README.md` e os schemas fechados contra escrita de contador e status.
   Endpoints: `POST /donations`, `POST /donations/:id/receive`,
   `POST /deliveries`, `POST /deliveries/:id/complete`,
   `POST /deliveries/:id/cancel`, `POST /inventory-counts` e
   `POST /inventory-adjustments`, mais o CRUD de `item-categories` e
   `inventory-items`. Os verbos são em inglês; a interface do React fica em
   português.
3. **`tests/inventory.ts`**: as sete operações contra o D1 local, com as duas
   invariantes verificadas depois de cada passo. É a única camada que consegue
   provar a aritmética dos contadores, porque o stub de `tests/api.ts` é sem
   estado. Ver [`arquitetura.md`](arquitetura.md).
4. **`tests/api.ts`** com `batch()` e `meta.changes`, cobrindo os códigos novos.

5. **Modelo antigo removido** — `coleta`, `entrega`, `item`, `nome_item` e
   `categoria_item` saíram do schema, dos endpoints e dos casos de teste. A
   migration `20261001222515_remarkable_wendell_rand` derruba as cinco e o
   histórico de migrations foi preservado, para servir de caminho ao banco remoto.
6. **Seed reescrito** — `generate.ts` deriva `on_hand` e `reserved_quantity`
   das movimentações, numa simulação em memória, e valida as duas invariantes
   antes de devolver; `mock_data/catalogo.json` ganhou a `unit` dos 130 itens.
7. **Esquema Zod compartilhado** — criado `inventoryItemTableViewSchema` em
   `src/worker/db/schema.ts` que substitui `categoryId` por `categoryName` e é
   usado tanto no backend (para validação de resposta) quanto no frontend
   (para validação de dados recebidos), garantindo consistência entre camadas.
8. **Migrado para Hono Groups** — as rotas de `inventory-items` foram movidas
   para `src/worker/routes/inventory-items.ts` usando instâncias explícitas de
   `Hono()` em vez do padrão `registerResource`, permitindo maior flexibilidade
   para personalizar queries (como o join com `itemCategory` para obter
   `categoryName`) e seguindo as melhores práticas do Hono para agrupamento de
   rotas.
9. **Corrigidos imports de utilitários de tabela** — movidos os componentes de
   tabela (`table-features.ts`, `table-pagination.tsx`, `table-sortable-header.tsx`,
   `table-toolbar.tsx`, `table-view-state.ts`) de `src/react-app/components/tables/`
   para `src/react-app/components/tables/utils/` e atualizados todos os imports
   correspondentes em componentes de tabela e formulários para refletir a nova
   estrutura, eliminando erros de "Cannot find module".
10. **Estender padrão categoryName para outras tabelas** — aplicar o mesmo processo
    usado para inventory-items (substituir IDs estrangeiros por nomes legíveis) às
    tabelas `/donations` e `/deliveries`:
    - Criar schemas de visualização compartilhados (ex: donationTableViewSchema,
      deliveryTableViewSchema) em `src/worker/db/schema.ts`
    - Substituir `donorId` por `donorName`, `beneficiaryId` por `beneficiaryName`,
      `inventoryItemId` por `inventoryItemName` onde apropriado
    - Atualizar rotas explícitas para usar esses schemas e fazer os joins necessários
    - Atualizar tipos e queries do frontend para usar os novos schemas de visualização

### O que falta

1. **O rename de `assistido` e `doador`** para `beneficiary` e `donor`, depois
   que a branch da tela de doador entrar. É o único que falta para o desenho do
   `future/README.md` fechar.
2. **Telas do estoque** — `inventory-item`, `item-category`, `donation` e
   `delivery`. As receitas estão em [`frontend-tabela.md`](frontend-tabela.md) e
   [`frontend-formulario.md`](frontend-formulario.md), mas as transições de
   estoque não são CRUD: `receive`, `complete` e `cancel` são botões de ação com
   a `409 INSUFFICIENT_STOCK` ao lado, não abas de um formulário.

9. ⏳ **`db-seed` e o caminho do `getPlatformProxy()`** — `wrangler d1 migrations
   apply --local` e o `getPlatformProxy()` do seed não compartilharam o estado
   numa execução limpa: com o diretório de estado apagado, `apply` não criou as
   tabelas e o seed morreu com `no such table`. O contorno foi rodar a migration
   versionada com `wrangler d1 execute --local --file=`. Vale descobrir por que os
   dois não conversam, porque o sintoma é `db-seed` quebrado sem aviso.

## Fora do escopo do MVP

- Google Maps / rotas de coleta (exige faturamento Google e cuidados de LGPD)
- Dashboard com indicadores e análise de dados (requisito opcional do tema)
- Notificações por e-mail/WhatsApp
