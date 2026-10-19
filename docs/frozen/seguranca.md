# Segurança

> **A instituição é a instância.** Decidido em 19/10/2026: uma instância do
> sistema serve **uma** instituição, e outra instituição é outra instância, com
> o seu próprio banco. Não existe `organization_id` em nenhuma tabela de
> domínio, e nenhuma query filtra por organização.
>
> Isso **substitui** o modelo multi-tenant que este documento descrevia. As
> três regras de isolamento por tenant caem por construção — não há o que
> filtrar. O que resta é autenticação, autorização, segredos e LGPD.

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
