# Segurança

> **A instituição é a instância.** Decidido em 19/10/2026: uma instância do
> sistema serve **uma** instituição, e outra instituição é outra instância, com
> o seu próprio banco. Não existe `organization_id` em nenhuma tabela de
> domínio, e nenhuma query filtra por organização.
>
> Isso **substitui** o modelo multi-tenant que este documento descrevia. As
> três regras de isolamento por tenant caem por construção — não há o que
> filtrar. O que resta é autenticação, autorização, segredos e LGPD.

## Registro da decisão

| | |
|---|---|
| **Decisão** | Instância única por instituição. O sistema é **single-tenant**, e isso é definitivo, não provisório. |
| **Quando** | 19/10/2026, na branch `mess/but-in-a-good-way` |
| **Rastreada por** | [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13) — *Middleware multi-tenant (filtro por organization_id)* — **encerrada**, porque o que ela pedia é exatamente o que a decisão descarta |
| **Documentos** | Este arquivo, [`api.md`](api.md) (a seção "A instituição é a instância"), [`../backlog-pi2.md`](../backlog-pi2.md) (item 7) e o [`../../AGENTS.md`](../../AGENTS.md) |

**O que a decisão proíbe, e é a parte que costuma ser esquecida:**

- **não criar** `organization_id` em nenhuma tabela de domínio;
- **não filtrar** nenhuma query por organização — não há o que filtrar;
- **não reintroduzir** o middleware multi-tenant, nem "só por segurança".

E o que ela **não** resolve: o modelo de **papéis**. `owner`, `admin`,
`staff` e `viewer` continuam pendentes, e são o que falta para o checklist de
prontidão da rota ter a caixa do "permissão verificada no backend" marcada.

O plugin `organization()` do Better Auth continua ativo, e as tabelas de
organização continuam existindo. Isso é **a isca mais fácil do repo**,
porque parece que o filtro existe — e ele não existe.

Resumo das decisões de segurança do sistema. Como o sistema armazena dados
socioeconômicos de famílias assistidas (dados sensíveis, LGPD), o controle de
acesso é requisito de segurança, não detalhe técnico.

## Modelo escolhido: instância única por instituição

Uma aplicação (um Worker, um banco D1) atende **uma** instituição. Uma segunda
instituição é um segundo deployment, com o seu próprio D1, o seu próprio domínio
e os seus próprios segredos.

O modelo anterior — uma aplicação multi-tenant, com cada instituição como uma
`organization` do Better Auth — foi **descartado**: exigiria `organization_id`
em toda tabela de domínio, filtro por organização em toda query, e conferência
de organização em todo acesso por ID. Uma instância por instituição troca
código por operação, e a operação é o que se resolve com um deploy.

### Consequência operacional

O plano Free do D1 permite **10 bancos por conta**. Uma instância por
instituição significa um banco por instituição, então:

- cada instituição traz a sua própria conta Cloudflare, **ou**
- o sistema roda no plano pago, que permite 50.000 bancos por conta.

A escolha é de operação, não de código, e vale decidir antes do primeiro
deployment para outra instituição.

### A tabela `organization` do Better Auth

O plugin `organization()` continua ativo e as tabelas de organização existem,
mas **não são usadas pelo domínio**: a organização do Better Auth deixou de
ser a instituição. Nenhuma tabela de referência, e nenhuma query, depende
delas.

## Regras obrigatórias

1. **Toda rota de domínio exige sessão.** O `requireSession` vale para
   `/api/v1/*` e não para `/api/auth/*`, que precisa ficar público para login
   e cadastro.
2. **Permissões no backend, não no frontend** — esconder botão não é
   segurança. Papéis sugeridos: `owner`, `admin`, `staff`, `viewer`.
3. **Convites são de uso único, com expiração** — o token do convite define a
   organização; o cliente não pode escolher.
4. **Segredos nunca no repositório** — `BETTER_AUTH_SECRET` e afins vão via
   `wrangler secret put`, nunca commitados. (No PI I, o `config.py` do Flask
   vazou SECRET_KEY e salt no GitHub — não repetir.)
5. **A trilha de auditoria é append-only.** O ledger de estoque não é editado
   nem apagado: correção é movimento novo. O mesmo vale para o histórico de
   documentos, que só é alterado por estorno.
6. **A reconciliação é a segunda camada de segurança do estoque.** O saldo é
   cache e o ledger é a verdade; a reconciliação diária confere os dois, e a
   segunda invariante prova que o estoque nunca overcommitou. Uma divergência
   **avisa e não bloqueia** — a instituição não para de entregar por causa de
   bookkeeping — e o reparo é reconstruir o cache a partir do ledger.

## Checklist antes de considerar uma rota "pronta"

- [x] Exige autenticação
- [ ] Permissão do papel do usuário verificada no backend
- [ ] Teste automatizado cobrindo acesso indevido (401/403)
- [ ] A rota não aceita campo que o cliente não devolve (o `id` é do servidor)

O que saiu do checklist era a conferência de organização — registro por ID,
filtro por `organization_id`, e o teste cross-tenant. Com uma instituição por
instância, **esses testes não têm o que verificar**.

## LGPD no desenvolvimento

- Nunca usar dados reais de assistidos em desenvolvimento, demonstrações ou vídeos
- Não publicar endereços de famílias assistidas (se houver mapa, usar bairro ou
  posição aproximada, nunca a residência exata)
- Entrevistas com a comunidade exigem TCLE (modelo da Univesp no AVA)
