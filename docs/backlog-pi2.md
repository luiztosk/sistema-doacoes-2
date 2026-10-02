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
   três modos (`/assistidos`, `/assistidos/novo`, `/assistidos/$id`).
   `doador` está **liberado** e é o próximo: é o `assistido` sem a parte social.
   `coleta`, `entrega` e `item` **não ganham tela**: o modelo de estoque já foi
   decidido (`inventory_item`, `donation`, `delivery`, reserva e ajuste) e ainda
   não foi implementado, em [`future/README.md`](future/README.md). As receitas
   estão em [`frontend-tabela.md`](frontend-tabela.md) e
   [`frontend-formulario.md`](frontend-formulario.md). Busca, ordenação e
   paginação já estão na tabela de `assistido`, e os arquivos
   `components/tables/table-*.ts(x)` são genéricos, então `doador` nasce com
   elas.
4. ⏳ **Preservar o estado da tabela entre a lista e o detalhe** — ordenação,
   busca, filtro e página vivem no componente, que desmonta ao navegar para
   `/assistidos/$id`. Um `useTable` novo nasce com `initialState`, então voltar
   de um save cai na primeira página e sem ordenação. A correção é o estado da
   visualização nos search params da rota, com a rota de detalhe repassando os
   parâmetros no `navigate` de volta. A alternativa — `sessionStorage` por
   recurso — esconde estado e não é compartilhável, então não é a escolhida.
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

## Fora do escopo do MVP

- Google Maps / rotas de coleta (exige faturamento Google e cuidados de LGPD)
- Dashboard com indicadores e análise de dados (requisito opcional do tema)
- Notificações por e-mail/WhatsApp