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

## Dados de demonstração

Não há mais CSV em `mock_data/`. O seed gera os dados a partir dos schemas zod da
própria aplicação, e o gerador é o único lugar onde o dado de demonstração é
escrito:

```
src/worker/db/generate.ts   # gera e valida cada linha contra o *SelectSchema
src/worker/db/seed.ts       # insere o que o gerador devolveu
mock_data/municipios.json   # pares cidade/UF do IBGE
mock_data/catalogo.json     # as 9 categorias e os 114 nomes de item
```

O ponto do desenho é que **o schema é a única fonte da verdade, e é conferido**:
`gerarSeed()` valida cada linha com o `*SelectSchema` da tabela antes de
devolvê-la, e o seed para com o nome do campo e da linha se algo estiver errado.
Os dados não podem mais divergir do schema, que era a raiz dos bugs do
[#44](https://github.com/luiztosk/sistema-doacoes-2/issues/44) — o CSV gravava
`True` onde o banco queria `1`, e nada dizia nada.

O gerador é determinístico (`seed(42)`), o que importa porque a coleção do Insomnia
aponta para o banco de demonstração: o mesmo `npm run db-seed` produz sempre as
mesmas 888 linhas.

O que o gerador faz sozinho, e o que ele não faz:

| | |
|---|---|
| `fake()` a partir do schema | `enum`, faixas numéricas, `uuidv4`, `regex` (o CEP) |
| `getFaker()` direto | nomes, logradouros, telefone, e-mail, booleanos |
| `mock_data/municipios.json` | cidade e UF saem sempre coerentes entre si |
| escrito à mão | a ordem entre as tabelas, as listas de id passadas adiante, a máquina `AGUARDA_COLETA → EM_ESTOQUE → ENTREGUE` e `entrega` depois de `coleta` |

A última linha é o que nenhum schema consegue expressar: referência cruzada e
ordem de evento dependem de linhas que ainda não existem quando o dado é gerado.
`faker.seed()` só fixa a sequência de sorteios — não tem modo relacional.

Para virar o gerador em dado novo, mexa só em `ROWS_PER_TABLE` e na função
`criar*` da tabela. Ajustar quantidade não exige tocar em mais nada.

## Migração do sistema legado (PI I)

O sistema anterior (Flask + SQLAlchemy + SQLite) está em
[LuisGabriel01/sistema-doacoes](https://github.com/LuisGabriel01/sistema-doacoes),
fixado para esta análise no commit `7741bd9` (a tag `pi1-final` citada
anteriormente não existe no repositório legado). Ele serve como referência de:

- **Modelo de dados**: tabelas `instituicao`, `doador`, `assistido`, `coleta`,
  `entrega`, `item`, `categoria_item`, `nome_item` (ver ERM no README do repo legado)
- **Fluxos de tela**: vídeo de demonstração em
  <https://www.youtube.com/watch?v=8LkkXIC9ppg>
- **Status dos itens**: `AGUARDA_COLETA` → `EM_ESTOQUE` → `ENTREGUE`

Os dados do legado são fictícios (mock), então não há migração de dados reais —
apenas o schema será traduzido para o Drizzle/D1.
