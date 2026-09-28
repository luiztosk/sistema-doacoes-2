# Arquivo

Documentos de planejamento que registraram decisões do passado. **Não descrevem
o estado atual do código** — kept por causa do *porquê*, não do *como*.

Quando um item aparece aqui marcado como "ainda vale", ele é a referência
histórica para uma decisão que **não** foi implementada; o plano ativo está em
[`../backlog-pi2.md`](../backlog-pi2.md).

| Documento | Data | Situação |
|---|---|---|
| [`plano-ui-stack.md`](./plano-ui-stack.md) | 16/09/2026 | **Superado.** Definiu a stack de UI. Duas premissas mudaram depois: o `better-auth-ui` foi adotado e removido, e o shadcn foi instalado sobre **Base UI**, não Radix. |
| [`plano-integracao-tanstack-router-better-auth-ui.md`](./plano-integracao-tanstack-router-better-auth-ui.md) | 21/09/2026 | **Superado.** Executado em boa parte, mas por outro desenho: route tree gerado pelo plugin, e `src/lib`/`src/components` movidos para dentro de `src/react-app`. As fases 3 e 4 continuam de pé. |
| [`plano-issue-11.md`](./plano-issue-11.md) | 14/09/2026 | **Concluído**, com exceção do `organization_id`, revertido de propósito e hoje rastreado pela issue #13. |
| [`plano-quizena-lh.md`](./plano-quizena-lh.md) | 26/08/2026 | **Histórico.** Registro de ajuste do plano de ação. Só a linha Q6 (19/10/2026) continua em aberto. |

## Por que arquivar em vez de atualizar

Estes documentos estavam com `[x]` em itens que nunca aconteceram (ex.: "sem
instalar `@tanstack/router-plugin`" — o plugin está instalado) e descrevendo
arquivos que não existem mais. Corrigi-los item a item seria reescrever quatro
histórias diferentes. Preferi marcar o que superou o quê e mover o peso para os
documentos vivos, que passam a ser [`../api.md`](../api.md),
[`../modelos-db.md`](../modelos-db.md) e [`../arquitetura.md`](../arquitetura.md).
