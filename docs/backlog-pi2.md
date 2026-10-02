# Backlog técnico — PI II

O que falta **neste trimestre**, e o que já está resolvido. Os itens que não
dependem deste trimestre estão em [`future/`](future/README.md) e
[`frozen/`](frozen/README.md).

Estado conferido em 30/09/2026.

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
   `doador` está **liberado** e é o próximo: é o `assistido` sem a parte social.
   `coleta`, `entrega` e `item` **não ganham tela**: o modelo de estoque já foi
   decidido (`inventory_item`, `donation`, `delivery`, reserva e ajuste) e ainda
   não foi implementado, em [`future/README.md`](future/README.md). As receitas
   estão em [`frontend-tabela.md`](frontend-tabela.md) e
   [`frontend-formulario.md`](frontend-formulario.md). Busca, ordenação e
   paginação já estão na tabela de `assistido`, e os arquivos
   `components/tables/table-*.ts(x)` são genéricos, então `doador` nasce com
   elas.
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
8. ⏳ **`db-seed` e o caminho do `getPlatformProxy()`** — `wrangler d1 migrations
   apply --local` e o `getPlatformProxy()` do seed não compartilharam o estado
   numa execução limpa: com o diretório de estado apagado, `apply` não criou as
   tabelas e o seed morreu com `no such table`. O contorno foi rodar a migration
   versionada com `wrangler d1 execute --local --file=`. Vale descobrir por que os
   dois não conversam, porque o sintoma é `db-seed` quebrado sem aviso.

## Fora do escopo do MVP

- Google Maps / rotas de coleta (exige faturamento Google e cuidados de LGPD)
- Dashboard com indicadores e análise de dados (requisito opcional do tema)
- Notificações por e-mail/WhatsApp