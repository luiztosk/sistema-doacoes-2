# Arquitetura do Sistema

Registro das decisões técnicas do PI II. Última atualização: 26/08/2026.

## Stack definida

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | SPA que consome a API; HMR rápido no desenvolvimento |
| Backend / API | Hono | Leve, feito para edge, integrado ao Cloudflare Workers; sintaxe parecida com Express |
| Hospedagem | Cloudflare Workers | Deploy global, escala automática, sem servidor para gerenciar |
| Banco de dados | Cloudflare D1 (SQLite no edge) | Nativo do Workers, gerenciado via Drizzle ORM |
| ORM | Drizzle ORM + drizzle-kit | Type-safe, gera migrations SQL |
| Autenticação | Better Auth (plugin Organization) | Substitui o Flask-Security; cuida de sessão, CSRF e convites |
| Testes | Vitest (automatizados) + Insomnia (exploração manual da API) | Testes automatizados são requisito do tema do PI II |
| Controle de versão | Git + GitHub | Branch `main` protegida; trabalho via feature branches + PR |

> Next.js foi considerado e descartado em favor do Hono, que é mais leve e mais
> integrado ao ecossistema do Cloudflare Workers.

## Fluxo de deploy (já configurado)

- O Cloudflare Workers está integrado ao GitHub: **todo commit na `main` dispara
  build e deploy automáticos** (por isso a `main` é protegida — só recebe PR).
- Para testar uma versão sem afetar produção: usar a branch `stage` ou pedir um
  build de um commit específico.
- Protótipo no ar: <https://sd2.tosk.dev>

## Fluxo de contribuição

1. Criar uma feature branch a partir da `main` (ou usar `stage`)
2. Commits pequenos e descritivos
3. Abrir Pull Request para a `main`
4. Após revisão e merge, o deploy acontece sozinho

## Migração do sistema legado (PI I)

O sistema anterior (Flask + SQLAlchemy + SQLite) está em
[LuisGabriel01/sistema-doacoes](https://github.com/LuisGabriel01/sistema-doacoes),
preservado na tag `pi1-final`. Ele serve como referência de:

- **Modelo de dados**: tabelas `instituicao`, `doador`, `assistido`, `coleta`,
  `entrega`, `item`, `categoria_item`, `nome_item` (ver ERM no README do repo legado)
- **Fluxos de tela**: vídeo de demonstração em
  <https://www.youtube.com/watch?v=8LkkXIC9ppg>
- **Status dos itens**: `AGUARDA_COLETA` → `EM_ESTOQUE` → `ENTREGUE`

Os dados do legado são fictícios (mock), então não há migração de dados reais —
apenas o schema será traduzido para o Drizzle/D1.
