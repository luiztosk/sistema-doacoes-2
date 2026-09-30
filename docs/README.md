# Documentação

Índice de `docs/`. Confira o estado antes de confiar num documento como
descrição do código.

| Documento | Estado | Do que trata |
|---|---|---|
| [`frontend-tabela.md`](frontend-tabela.md) | **ativo** | Como criar a lista de um recurso, espelhando `components/tables/assistidos.tsx` |
| [`frontend-formulario.md`](frontend-formulario.md) | **ativo** | Como criar o formulário de um recurso, nos três modos |
| [`arquitetura.md`](arquitetura.md) | **ativo** | Stack, o gate de build e o fluxo de branch |
| [`backlog-pi2.md`](backlog-pi2.md) | **ativo** | O que falta, só deste trimestre |
| [`frozen/`](frozen/README.md) | **congelado** | Contrato da API e modelo do banco. Leitura obrigatória, **não mexa** |
| [`future/`](future/README.md) | **previsto** | Isolamento por organização, ViaCEP, papéis, acessibilidade |
| [`archive/`](archive/README.md) | **histórico** | O que já aconteceu. Não use como referência do estado atual |

## Estado, em uma linha

- **ativo** — descreve o que está em andamento agora; atualize ao mudar.
- **congelado** — funciona e não deve ser tocado nesta rodada; leia, não edite.
- **previsto** — não existe ainda e vai ser feito; não implemente agora.
- **histórico** — já aconteceu; não atualize e não use como referência.

## Se você está aqui para criar uma tela

1. [`frontend-tabela.md`](frontend-tabela.md) e
   [`frontend-formulario.md`](frontend-formulario.md). Os dois apontam para o
   código a espelhar; `assistido` é a referência.
2. [`../AGENTS.md`](../AGENTS.md) para o estilo e as armadilhas.
3. O backend está **congelado**: `frozen/` é leitura.

Três coisas que esses documentos não deixam óbvias:

1. **O esquema é a fonte da verdade, e é conferido.** As colunas e os tipos saem
   de `src/worker/db/schema.ts`, e o gerador do seed valida cada linha que
   produz contra o `*SelectSchema`. Nenhuma tela inventa campo.
2. **As tabelas de domínio não têm `organization_id`.** O plugin `organization()`
   do Better Auth está ativo e as tabelas de organização existem, mas o filtro
   por organização não foi implementado. Não introduza um valor fixo para
   "simular" o filtro — isso viola a regra 1 de
   [`frozen/seguranca.md`](frozen/seguranca.md). Ver
   [`future/README.md`](future/README.md).
3. **A preview URL usa as bindings de produção.** Testar por ela escreve no
   `prod-sistema-doacoes-2`. Ver [`arquitetura.md`](arquitetura.md).
