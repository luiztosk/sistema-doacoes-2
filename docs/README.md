# Documentação

Índice de `docs/`. Cada documento tem um estado; confira antes de confiar nele
como descrição do código.

| Documento | Estado | Do que trata |
|---|---|---|
| [`arquitetura.md`](./arquitetura.md) | **ativo** | Stack, fluxo de deploy, o que roda a cada build, fluxo de contribuição, duas camadas de teste |
| [`api.md`](./api.md) | **ativo** | Os 25 endpoints, o contrato de erro, e a seção "não está pronto para produção" |
| [`modelos-db.md`](./modelos-db.md) | **ativo** | As 7 tabelas de domínio, constraints, índices e a tradução do modelo legado |
| [`backlog-pi2.md`](./backlog-pi2.md) | **ativo** | O que ainda falta implementar, por prioridade |
| [`seguranca.md`](./seguranca.md) | **política** | Regras obrigatórias de isolamento entre instituições e LGPD. Descreve o que *deve* ser verdade, não o que é — leia junto com [`api.md` §Não está pronto para produção](./api.md#%EF%B8%8F-n%C3%A3o-est%C3%A1-pronto-para-produ%C3%A7%C3%A3o) |
| [`drizzle-migrations.md`](./drizzle-migrations.md) | **referência** | Como gerar e aplicar migrations do Drizzle neste projeto |
| [`fluxo-telas/`](./fluxo-telas/README.md) | **referência** | Comportamento do sistema do PI I, para reconstruir as telas |
| [`archive/`](./archive/README.md) | **histórico** | Planos concluídos ou superados. Descrevem o passado, não o presente |

## Estado, em uma linha

- **ativo** — foi conferido contra o código em 28/09/2026 e descreve o estado atual.
- **política** — é uma especificação de requisito. Itens não marcados como
  cumpridos **não** estão implementados.
- **referência** — material de apoio, datado e sem obrigação de refletir o código.
- **histórico** — movido para `archive/`; preserva decisões, não descreve o estado.

## Se você está aqui para mudar código

Três coisas que esses documentos não deixam óbvias:

1. **As tabelas de domínio não têm `organization_id`.** Foi removida junto com a
   integração do Better Auth e volta com a
   [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13). Não
   reintroduza um valor fixo para simular o filtro — isso viola a regra 1 de
   [`seguranca.md`](./seguranca.md).
2. **Existem 26 `check()` no banco que não estão mais no `schema.ts`.** A
   migration que os remove ainda não foi gerada. Detalhes em
   [`modelos-db.md`](./modelos-db.md).
3. **A preview URL usa as bindings de produção.** Testar por ela escreve no
   `prod-sistema-doacoes-2`. Ver [`arquitetura.md`](./arquitetura.md).
