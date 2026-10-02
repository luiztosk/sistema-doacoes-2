# Arquitetura do Sistema

Registro das decisões técnicas do PI II. Última atualização: 28/09/2026.

## Stack definida

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | SPA que consome a API; HMR rápido no desenvolvimento |
| Backend / API | Hono | Leve, feito para edge, integrado ao Cloudflare Workers; sintaxe parecida com Express |
| Hospedagem | Cloudflare Workers | Deploy global, escala automática, sem servidor para gerenciar |
| Banco de dados | Cloudflare D1 (SQLite no edge) | Nativo do Workers, gerenciado via Drizzle ORM |
| ORM | Drizzle ORM + drizzle-kit | Type-safe, gera migrations SQL |
| Autenticação | Better Auth (plugin Organization) | Substitui o Flask-Security; cuida de sessão, CSRF e convites |
| Testes | `tsx tests/api.ts` (automatizados) + Insomnia (exploração manual da API) | Testes automatizados são requisito do tema do PI II |
| Controle de versão | Git + GitHub | Branch `main` protegida; trabalho via feature branches + PR |

> Next.js foi considerado e descartado em favor do Hono, que é mais leve e mais
> integrado ao ecossistema do Cloudflare Workers.

## Fluxo de deploy (já configurado)

- O Cloudflare Workers está integrado ao GitHub: **todo commit na `main` dispara
  build e deploy automáticos** (por isso a `main` é protegida — só recebe PR).
- Todo push para uma branch que não seja a `main` também dispara um build e gera
  uma **preview URL**, postada como comentário no Pull Request. É esse link que
  permite testar antes do merge.
- Protótipo no ar: <https://sd2.tosk.dev>

### Atenção: a preview usa os recursos de produção

A preview roda com as mesmas *bindings* da produção, ou seja, no mesmo banco
`prod-sistema-doacoes-2`. **Testar manualmente pela preview URL escreve no banco
de produção.** Hoje esse banco só tem dado de seed, e `npm run db-seed` recria
tudo, então o risco é baixo — mas não é um ambiente isolado. Se algum dia
precisarmos de um banco separado para testes, o caminho é migrar para Worker
Previews (isolamento por branch) ou criar um `env` de staging no `wrangler.jsonc`.

### O que roda a cada build

O Cloudflare executa o script `build` do `package.json`, que hoje é:

```
npm run lint && npm test && tsc -b && vite build
```

O `&&` faz o build parar no primeiro erro: um problema de lint ou um teste
quebrado **impedem o deploy**. Esse build também reporta um status check no
GitHub, e a `main` exige que ele passe — ou seja, um merge com lint quebrado ou
teste vermelho não entra.

Como esse gate é automático, ele também bloqueia o merge por motivos que não são
código: cota de build esgotada, token de API inválido ou timeout de 20 min. Se
a `main` ficar travada sem erro de código, checar o histórico de builds no
dashboard antes de suspeitar do repositório.

## Fluxo de contribuição

1. Criar uma feature branch a partir da `main`
   - `main` é a **única** branch de longa vida. `dev` e `stage` existiram e foram
     abandonadas (set/2026 e ago/2026) — não criar de novo.
2. Commits pequenos e descritivos
3. Abrir o Pull Request cedo, pode ser como *draft*, só para pegar a preview URL
4. Fazer os testes manuais naquela preview URL, em lote
5. Mergear quando o check passar; o deploy acontece sozinho

### Duas camadas de teste

| Camada | Comando | Quando |
|---|---|---|
| Automatizada | `npm run lint`, `npm test` | A cada push, via build do Cloudflare |
| Manual | Insomnia, fluxos de tela | Em lote, sobre a preview URL do PR |

Automatizada roda sempre porque custa segundos. Manual é em lote porque custa
minutos — mas nunca reste a testes automatizados, que são justamente o que
mantém um lote longo confiável.

### Uma terceira camada, que só roda com banco

`npm test` roda contra um **stub em memória**: o D1 é substituído por um objeto
que devolve as linhas que o caso declara e falha como o D1 falha quando o caso
pede. Ele é rápido e determinístico, mas não tem estado — não sabe o que uma
requisição anterior fez, e não executa `db.batch()` de verdade.

O modelo de estoque depende justamente do que o stub não tem: `on_hand` e
`reserved_quantity` só fazem sentido como resultado de uma sequência de operações
sobre o mesmo banco. Por isso existe uma segunda suíte:

```bash
npm run local-db-init    # migrations + tipos + seed, tudo local
npm run test:inventory   # as 7 operações do estoque, contra o D1 local
```

[`tests/inventory.ts`](../tests/inventory.ts) cria a sessão, as categorias e os
itens, roda as sete operações na ordem e **verifica as duas invariantes** depois
de cada passo:

```
on_hand >= reserved_quantity >= 0
reserved_quantity == SUM(delivery_line) JOIN delivery WHERE status = 'OPEN'
```

Ela **não entra no gate de build**, porque precisa de um banco local com as
migrations aplicadas: quem roda é a pessoa, com `npm run local-db-init` antes.
Isso é o mesmo arranjo que a verificação por Insomnia, e a razão é a mesma — o
stub não tem ciclo de vida. As asserções que o stub consegue fazer (código de
erro, status, mensagem, validação) ficam em `npm test`; a aritmética dos
contadores fica aqui.

Ele também confere que todo id gravado no banco está em minúsculo, nas onze
tabelas, porque `crypto.randomUUID()` devolve minúsculo e `fake(z.uuidv4())`
devolve maiúsculo — e o `.uuid()` do zod aceita os dois, então essa diferença
ficaria invisível até alguém colar um id do seed numa chamada.

O script é autossanável: as linhas que ele cria são ancoradas em nomes
(`check-item-%`, `check-categoria-%`, `note = 'check'`) e apagadas no começo e no
fim, de forma que uma execução interrompida não envenena a seguinte.

## Dados de demonstração

Não há mais CSV em `mock_data/`. O seed gera os dados a partir dos schemas zod da
própria aplicação: `src/worker/db/generate.ts` gera e valida cada linha contra o
`*SelectSchema` antes de devolvê-la, e `src/worker/db/seed.ts` insere. O gerador é
determinístico (`seed(42)`), então o mesmo `npm run db-seed` produz sempre as
mesmas 888 linhas.

O que o gerador não faz: referência cruzada e ordem de evento. `faker` não tem
modo relacional, então `criarColetas(doadores)` recebe as linhas já criadas e a
ordem entre as tabelas é escrita à mão.

Para virar o gerador em dado novo, mexa só em `ROWS_PER_TABLE` e na função
`criar*` da tabela.
