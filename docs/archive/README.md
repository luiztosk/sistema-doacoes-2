# Arquivo

Documentos de planejamento que registraram decisões do passado. **Não descrevem
o estado atual do código** — kept por causa do *porquê*, não do *como*.

Quando um item aparece aqui marcado como "ainda vale", ele é a referência
histórica para uma decisão que **não** foi implementada; o plano ativo está em
[`../backlog-pi2.md`](../backlog-pi2.md).

| Documento | Data | Situação |
|---|---|---|
| [`plano-ui-stack.md`](plano-ui-stack.md) | 16/09/2026 | **Superado.** Definiu a stack de UI. Duas premissas mudaram depois: o `better-auth-ui` foi adotado e removido, e o shadcn foi instalado sobre **Base UI**, não Radix. |
| [`plano-integracao-tanstack-router-better-auth-ui.md`](plano-integracao-tanstack-router-better-auth-ui.md) | 21/09/2026 | **Superado.** Executado em boa parte, mas por outro desenho: route tree gerado pelo plugin, e `src/lib`/`src/components` movidos para dentro de `src/react-app`. As fases 3 e 4 continuam de pé. |
| [`plano-issue-11.md`](plano-issue-11.md) | 14/09/2026 | **Concluído**, com exceção do `organization_id`, revertido de propósito e hoje rastreado pela issue #13. |
| [`plano-quizena-lh.md`](plano-quizena-lh.md) | 26/08/2026 | **Histórico.** Registro de ajuste do plano de ação. Só a linha Q6 (19/10/2026) continua em aberto. |
| [`fluxos-pi1.md`](fluxos-pi1.md) | — | **Superado.** Os campos das telas do PI I. Hoje quem manda é `src/worker/db/schema.ts`, não este documento. |
| [`transcricao-video.md`](transcricao-video.md) | — | **Referência.** Transcrição da demonstração do PI I. Serve para reconstruir telas, não para escrever código. |
| [`fluxo-telas-README.md`](fluxo-telas-README.md) | — | Índice da pasta `fluxo-telas/`, que foi desfeita. |
| [`modelos-db-cortes.md`](modelos-db-cortes.md) | — | **Não é estado atual.** `Regras de valor`, ERD, esboço do schema e diferenças do legado, removidos de [`../frozen/modelos-db.md`](../frozen/modelos-db.md) quando o backend foi congelado. |
| [`migracao-do-legado.md`](migracao-do-legado.md) | — | Descrição do Flask + SQLite do PI I, já traduzido para o Drizzle/D1. |

## Por que arquivar em vez de atualizar

Estes documentos estavam com `[x]` em itens que nunca aconteceram (ex.: "sem
instalar `@tanstack/router-plugin`" — o plugin está instalado) e descrevendo
arquivos que não existem mais. Corrigi-los item a item seria reescrever quatro
histórias diferentes. Preferi marcar o que superou o quê e mover o peso para os
documentos vivos: [`../arquitetura.md`](../arquitetura.md) e
[`../frontend-tabela.md`](../frontend-tabela.md).

## Não é a mesma coisa que `frozen/`

Aqui está o que **já aconteceu** e não é mais verdade. Em
[`../frozen/`](../frozen/README.md) está o que **funciona e não deve ser tocado**
nesta rodada — e que ainda é leitura obrigatória.
