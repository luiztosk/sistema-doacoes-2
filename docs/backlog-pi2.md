# Backlog técnico — PI II

O que falta **neste trimestre**, e o que já está resolvido. Os itens que não
dependem deste trimestre estão em [`future/`](future/README.md) e
[`frozen/`](frozen/README.md).

Estado conferido em 01/10/2026.

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
   três modos (`/assistidos`, `/assistidos/novo`, `/assistidos/$id`).
   `doador` está **liberado** e é o próximo: é o `assistido` sem a parte social.
   Vale o aviso do item 7: `doador` vira `donor` no redesenho do estoque, então a
   tela nasce com o nome que vai morrer.
   `coleta`, `entrega` e `item` **não ganham tela**: o modelo de estoque já foi
   decidido (`inventory_item`, `donation`, `delivery`, reserva e ajuste) e ainda
   não foi implementado, em [`future/README.md`](future/README.md). As receitas
   estão em [`frontend-tabela.md`](frontend-tabela.md) e
   [`frontend-formulario.md`](frontend-formulario.md).
4. ⏳ **Erro de mutation na tela** — hoje o `MutationCache` em
   `lib/query-client.ts` joga no `console` e não há `Alert`, `toast` nem
   `errorMap` por campo para falha de servidor. As mensagens do zod em
   `schema.ts` cobrem validação de campo, mas a API responde em inglês via
   `errors.ts`.
5. ⏳ **Fluxo de convite por link** — admin convida, usuário aceita e entra na
   organização. Depende do item 6.
6. ❌ **Multi-tenancy** — **é o buraco mais importante.** Falta a coluna
   `organization_id` nas tabelas de domínio e o middleware que filtra as
   queries. Rastreado pela
   [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13). Enquanto não
   existir, a API não deve receber dados reais. Não implementado nesta rodada:
   ver [`future/`](future/README.md).
7. ⏳ **Redesenho do estoque** — o modelo está decidido e escrito por inteiro em
   [`future/README.md`](future/README.md), e **não está implementado**: as tabelas
   de hoje continuam `coleta`, `entrega` e `item`. A implementação está na branch
   `feat/redesenho-estoque`, que **não está congelada**: nela mudanças quebrantes
   são autorizadas, sem passar pela regra 1 do
   [`frozen/seguranca.md`](frozen/seguranca.md) nem pelo contrato de forma do
   erro de [`frozen/api.md`](frozen/api.md). As três dúvidas que o desenho tinha
   sobre o D1 foram medidas localmente, e as três passaram:

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

### O que falta

1. **O rename de `assistido` e `doador`** para `beneficiary` e `donor`, depois
   que a branch da tela de doador entrar. É o único que falta para o desenho do
   `future/README.md` fechar.
2. **Telas do estoque** — `inventory-item`, `item-category`, `donation` e
   `delivery`. As receitas estão em [`frontend-tabela.md`](frontend-tabela.md) e
   [`frontend-formulario.md`](frontend-formulario.md), mas as transições de
   estoque não são CRUD: `receive`, `complete` e `cancel` são botões de ação com
   a `409 INSUFFICIENT_STOCK` ao lado, não abas de um formulário.

## Fora do escopo do MVP

- Google Maps / rotas de coleta (exige faturamento Google e cuidados de LGPD)
- Dashboard com indicadores e análise de dados (requisito opcional do tema)
- Notificações por e-mail/WhatsApp