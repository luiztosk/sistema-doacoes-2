# Backlog técnico — PI II

Estado real do repositório em 28/09/2026 e o que falta para cumprir os requisitos
do tema do PI II (framework web, banco de dados, JavaScript, nuvem, consumo de API,
acessibilidade, controle de versão e testes).

## Cobertura dos requisitos do tema

| Requisito do PI II | Status | Onde/como |
|---|---|---|
| Framework web | ✅ | Hono (backend) + React (frontend) |
| Banco de dados | ✅ | D1 provisionado + Drizzle, 7 tabelas e 2 migrations. Falta a migration que remove os 26 `check()` — ver [`modelos-db.md`](./modelos-db.md) |
| JavaScript/TypeScript | ✅ | Todo o código novo é TS, com `strict` e `noUnusedLocals` |
| Hospedagem em nuvem | ✅ | Cloudflare Workers, deploy automático na `main` |
| Consumo de API externa | ⏳ | **ViaCEP ainda não implementado** — plano abaixo (ver "ViaCEP") |
| Acessibilidade | ⏳ | **Parcial** — `aria-label` e `<label htmlFor>` em login/cadastro e navegação; falta um teste automatizado com axe (ver "Acessibilidade") |
| Controle de versão | ✅ | Git + GitHub + PRs, `main` protegida por status check |
| Testes | ✅ | `npm test` (`tsx tests/api.ts`, 28 casos da API) + Insomnia (manual) |

## Ordem de prioridade sugerida

Itens marcados ✅ já estão feitos; os demais são o que falta.

1. ✅ **Fundação do banco** — D1 provisionado, binding em `wrangler.jsonc`,
   `drizzle-orm`/`drizzle-kit` instalados e o schema traduzido do legado criado
   (`assistido`, `doador`, `categoria_item`, `nome_item`, `coleta`, `entrega`,
   `item`). **Não** foi criada a tabela `instituicao`: instituição é a
   `organization` do Better Auth.
2. ⏳ **Autenticação** — Better Auth com plugin Organization está pronto e o
   login/cadastro funcionam. Falta o **fluxo de convite por link** (admin convida,
   usuário aceita e entra na organização). Ver [`seguranca.md`](./seguranca.md).
3. ❌ **Multi-tenancy** — **é o buraco mais importante.** Falta a coluna
   `organization_id` nas tabelas de domínio e o middleware que valida a
   organização e filtra todas as queries. Rastreado pela
   [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13). Enquanto não
   existir, a API não deve receber dados reais.
4. ⏳ **Endpoints da API** — os 25 endpoints de CRUD existem e exigem sessão
   ([`api.md`](./api.md)), mas **não** filtram por organização (depende do item 3).
5. ⏳ **Telas React** — rotas protegidas existem via **TanStack Router**
   (`/auth/login`, `/auth/signup`, `/auth/logout`), não React Router. A tela de
   assistidos existe (`/assistidos`, `/assistidos/novo`, `/assistidos/$id`) e é
   a referência para os outros recursos: `lib/api/<recurso>.ts` com
   `queryOptions` e `mutationOptions`, e um formulário por recurso em
   `components/forms/`. Falta coletas, entregas, itens, doadores e estoque.
   **Erro de mutation ainda não aparece na tela** — o `MutationCache` em
   `lib/query-client.ts` joga no `console` e não há `Alert`, `toast` nem
   `errorMap` por campo para falha de servidor. As mensagens do zod em
   `schema.ts` estão em português e cobrem validação de campo, mas a API
   responde em inglês via `errors.ts`. Exibir erro é trabalho pendente.
6. ⏳ **Testes** — os 28 casos de endpoint existem (`tsx tests/api.ts`, sem
   Vitest). **Faltam** os fluxos críticos: autenticação e isolamento entre
   organizações (403 e cross-tenant), que são justamente o que a [#13] precisa.
7. ⏳ **API externa (ViaCEP)** — ver abaixo. As colunas de endereço separadas já
   existem, então a parte de dados está pronta.
8. ⏳ **Acessibilidade** — ver abaixo.

## API externa: ViaCEP (proposta)

Requisito do tema: consumo de API. Proposta: ao digitar o CEP no cadastro de
doador/assistido, consultar `https://viacep.com.br/ws/{cep}/json/` e preencher
logradouro, bairro, cidade e UF automaticamente.

- Gratuita, sem chave, sem cadastro
- Utilidade real no sistema (reduz erro de digitação de endereço)
- Exige separar o campo `endereco` do modelo legado em: CEP, logradouro, número,
  complemento, bairro, cidade, UF
- Tratar no frontend: CEP inválido e API fora do ar (fallback = preenchimento manual)

## Acessibilidade (proposta)

Requisito do tema. Medidas concretas a demonstrar:

- HTML semântico e hierarquia correta de títulos
- Todos os campos de formulário com `<label>` associado
- Navegação completa por teclado, com foco visível
- Contraste adequado de cores
- Mensagens de erro/sucesso perceptíveis por leitores de tela (`aria-live`)
- Teste manual com teclado e com NVDA ou VoiceOver
- Teste automatizado com axe (precisa de uma toolchain de browser que ainda não
  temos — o projeto não usa Playwright nem Vitest)

## Fora do escopo do MVP (discutir com o grupo)

- Google Maps / rotas de coleta (exige faturamento Google e cuidados de LGPD)
- Dashboard com indicadores e análise de dados (requisito opcional do tema)
- Notificações por e-mail/WhatsApp
