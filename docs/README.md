# Documentação

Índice de `docs/`. Confira o estado antes de confiar num documento como
descrição do código.

| Documento | Estado | O que trata |
|---|---|---|
| [`frontend-tabela.md`](frontend-tabela.md) | **ativo** | Como criar a lista de um recurso, espelhando `components/tables/contacts/beneficiaries.tsx` |
| [`frontend-formulario.md`](frontend-formulario.md) | **ativo** | Como criar o formulário de um recurso, nos três modos |
| [`arquitetura.md`](arquitetura.md) | **ativo** | Stack, o gate de build, o fluxo de branch e as decisões de modelo |
| [`backlog-pi2.md`](backlog-pi2.md) | **ativo** | O que falta, só deste trimestre |
| [`estado-atual.md`](estado-atual.md) | **ativo** | A branch `mess/but-in-a-good-way`: o que mudou, o que está quebrado e as pendências |
| [`validacao-doadores.md`](validacao-doadores.md) | **ativo** | Registro da verificação local das telas de doador (#60 e #62) |
| [`validacao-formatacao-68.md`](validacao-formatacao-68.md) | **ativo** | Formatação brasileira de datas e telefones: escopo, testes e roteiro manual (#68) |
| [`validacao-ordenacao-69.md`](validacao-ordenacao-69.md) | **ativo** | Padrões por tabela, URL e roteiro manual (#69) |
| [`validacao-selecao-70.md`](validacao-selecao-70.md) | **ativo** | Campos buscáveis de catálogo, testes e roteiro manual (#70) |
| [`frozen/`](frozen/README.md) | **congelado** | Contrato da API e modelo do banco. Leitura obrigatória, **não mexa** |
| [`future/`](future/README.md) | **previsto** | ViaCEP, papéis, acessibilidade. Também guarda o desenho do modelo de estoque **anterior**, substituído pelo ledger — é leitura histórica |
| [`archive/`](archive/README.md) | **histórico** | O que já aconteceu. Não use como referência do estado atual |

## Estado, em uma linha

- **ativo** — descreve o que está em andamento agora; atualize ao mudar.
- **congelado** — é o **contrato** em que o código opera. Não se arrasta com o
  código: muda por decisão explícita, e a decisão fica registrada em
  [`arquitetura.md`](arquitetura.md).
- **previsto** — não existe ainda e vai ser feito; não implemente agora.
- **histórico** — já aconteceu; não atualize e não use como referência.

> ⚠️ **O contrato de estoque está em transição.** O modelo de contadores virou
> **ledger** em 19/10/2026, e [`frozen/api.md`](frozen/api.md) e
> [`frozen/modelos-db.md`](frozen/modelos-db.md) já descrevem o contrato novo,
> que está **implementado** na branch `mess/but-in-a-good-way` — dos dois
> lados, a API e o frontend. O desenho anterior está em
> [`future/README.md`](future/README.md), como histórico.

## Se você está aqui para criar uma tela

1. [`frontend-tabela.md`](frontend-tabela.md) e
   [`frontend-formulario.md`](frontend-formulario.md). Os dois apontam para o
   código a espelhar; `contacts/beneficiaries` é a referência de um contato,
   `inventory/item` a de um catálogo, e `inventory/donation` a de um
   **documento**, com a lista de itens.
2. [`../AGENTS.md`](../AGENTS.md) para o estilo e as armadilhas.
3. O backend está **congelado**: `frozen/` é leitura. A branch
   `mess/but-in-a-good-way` levanta o congelamento, porque o modelo de
   estoque está sendo trocado por um ledger — ver a exceção no
   [`../AGENTS.md`](../AGENTS.md).

Três coisas que esses documentos não deixam óbvias:

1. **O contrato é a fonte da verdade, e é conferido.** As colunas e os tipos
   saem de `src/schemas/db/`, e o contrato da API está em zod escrito à mão, em
   `src/schemas/api/`: o gerador do seed valida cada linha que produz contra o
   schema do contrato, e a API valida o corpo e a resposta contra ele. Nenhuma
   tela inventa campo.
2. **A instituição é a instância.** Não existe `organization_id` em nenhuma
   tabela de domínio, e não vai existir: uma instância serve uma instituição, e
   outra instituição é outro deployment. O plugin `organization()` do Better Auth
   está ativo e as tabelas de organização existem, mas **não são usadas pelo
   domínio** — e essa é a isca mais fácil do repo. Ver
   [`frozen/seguranca.md`](frozen/seguranca.md).
3. **A preview URL usa as bindings de produção.** Testar por ela escreve no
   `prod-sistema-doacoes-2`. Ver [`arquitetura.md`](arquitetura.md).
