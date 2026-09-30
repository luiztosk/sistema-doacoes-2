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
   `coleta`, `entrega` e `item` estão **bloqueados** até o redesenho do modelo de
   estoque, em [`future/README.md`](future/README.md). As receitas estão em
   [`frontend-tabela.md`](frontend-tabela.md) e
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

## Fora do escopo do MVP

- Google Maps / rotas de coleta (exige faturamento Google e cuidados de LGPD)
- Dashboard com indicadores e análise de dados (requisito opcional do tema)
- Notificações por e-mail/WhatsApp