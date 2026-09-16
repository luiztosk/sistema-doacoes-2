# Backlog técnico — PI II

Estado real do repositório em 26/08/2026 e o que falta para cumprir os requisitos
do tema do PI II (framework web, banco de dados, JavaScript, nuvem, consumo de API,
acessibilidade, controle de versão e testes).

## Cobertura dos requisitos do tema

| Requisito do PI II | Status | Onde/como |
|---|---|---|
| Framework web | ✅ | Hono (backend) + React (frontend) |
| Banco de dados | ⏳ | D1 + Drizzle — **não provisionado ainda** |
| JavaScript/TypeScript | ✅ | Todo o código novo é TS |
| Hospedagem em nuvem | ✅ | Cloudflare Workers, deploy automático na `main` |
| Consumo de API externa | ❌ | **Não planejado ainda** — sugestão: ViaCEP (ver abaixo) |
| Acessibilidade | ❌ | **Não planejada ainda** (ver abaixo) |
| Controle de versão | ✅ | Git + GitHub + PRs |
| Testes | ❌ | Vitest (automatizados) + Insomnia (manual) — nenhum escrito ainda |

## Ordem de prioridade sugerida

1. **Fundação do banco** — provisionar D1 (`wrangler d1 create`), adicionar binding
   no `wrangler.json`, instalar `drizzle-orm`/`drizzle-kit` e criar o schema
   traduzido do modelo legado (`assistido`, `doador`, `instituicao`, `coleta`,
   `entrega`, `item`, `categoria_item`, `nome_item`)
2. **Autenticação** — Better Auth com plugin Organization (instituições) e fluxo de
   convite por link (admin convida, usuário aceita e entra na organização)
3. **Multi-tenancy** — middleware que valida a organização do usuário logado e
   filtra TODAS as queries por `organization_id` (ver `docs/seguranca.md`)
4. **Endpoints da API** — CRUD de assistidos, doadores, coletas, entregas e itens,
   todos autenticados e filtrados por organização
5. **Telas React** — rotas protegidas com React Router: login, cadastros, coletas,
   entregas, estoque
6. **Testes** — Vitest para fluxos críticos (auth, isolamento entre organizações,
   endpoints); Insomnia para exploração manual da API
7. **API externa (ViaCEP)** — ver abaixo
8. **Acessibilidade** — ver abaixo

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
- Teste automatizado com axe (pode rodar via Vitest/Playwright)

## Fora do escopo do MVP (discutir com o grupo)

- Google Maps / rotas de coleta (exige faturamento Google e cuidados de LGPD)
- Dashboard com indicadores e análise de dados (requisito opcional do tema)
- Notificações por e-mail/WhatsApp
