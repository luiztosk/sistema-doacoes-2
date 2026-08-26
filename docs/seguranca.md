# Segurança e multi-tenancy

Resumo das decisões de segurança para o sistema novo. Como o sistema armazena dados
socioeconômicos de famílias assistidas (dados sensíveis, LGPD), o isolamento entre
instituições é requisito de segurança, não detalhe técnico.

## Modelo escolhido: instância única multi-tenant

Uma única aplicação (um Worker, um banco D1) atende todas as instituições. Cada
instituição é uma **Organization** do Better Auth, e todo dado operacional carrega
`organization_id`. A alternativa (uma instância por instituição) foi descartada por
multiplicar a complexidade operacional (N bancos, N deploys, N segredos).

## Regras obrigatórias

1. **Nunca confiar em parâmetro do cliente** para identificar a instituição.
   `GET /api/doacoes?institutionId=123` é inseguro — o servidor deve derivar a
   organização da sessão autenticada.
2. **Toda query filtra por `organization_id`** — sem exceção.
3. **Todo acesso a registro por ID verifica a organização** — buscar
   `assistido` só por `id` permite IDOR (um usuário da instituição A lendo dados
   da B trocando o número na URL). Sempre:
   `WHERE id = :id AND organization_id = :orgDaSessao`
4. **Permissões no backend, não no frontend** — esconder botão não é segurança.
   Papéis sugeridos: `owner`, `admin`, `staff`, `viewer`.
5. **Convites são de uso único, com expiração e vinculados a uma organização** —
   o token do convite define a organização; o cliente não pode escolher.
6. **Segredos nunca no repositório** — `BETTER_AUTH_SECRET` e afins vão via
   `wrangler secret put`, nunca commitados. (No PI I, o `config.py` do Flask
   vazou SECRET_KEY e salt no GitHub — não repetir.)

## Checklist antes de considerar uma rota "pronta"

- [ ] Exige autenticação
- [ ] Valida que o usuário pertence à organização ativa
- [ ] Filtra os dados por `organization_id`
- [ ] Acesso por ID confere a organização do registro
- [ ] Permissão do papel do usuário verificada no backend
- [ ] Teste automatizado cobrindo acesso indevido (401/403 e cross-tenant)

## LGPD no desenvolvimento

- Nunca usar dados reais de assistidos em desenvolvimento, demonstrações ou vídeos
- Não publicar endereços de famílias assistidas (se houver mapa, usar bairro ou
  posição aproximada, nunca a residência exata)
- Entrevistas com a comunidade exigem TCLE (modelo da Univesp no AVA)
