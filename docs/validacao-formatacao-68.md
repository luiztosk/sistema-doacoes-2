# Validação — datas e telefones na exibição (#68)

Realizada em 22/10/2026, na branch `feat/formatacao-brasileira-68`, criada da
`main` atualizada no commit `e87b7c0`.

## Escopo e decisões

- `src/react-app/lib/format.ts` centraliza a apresentação, sem dependências novas.
- Datas: `dd/mm/aaaa`, com `Intl.DateTimeFormat("pt-BR")` e o fuso de quem lê.
- Telefones brasileiros: DDD e oito dígitos para fixo, nove para celular.
- Telefones internacionais ou fora desse padrão são preservados, sem inventar
  DDD ou descartar informação. Ausentes aparecem como `—`.
- Contatos usam a formatação nas células e nos campos bloqueados. Editar
  mantém o telefone E.164, sem máscara e sem alterar o estado ao trocar de modo.
- Histórico usa a data formatada na célula. Nos detalhes de doação/entrega,
  a data bloqueada é brasileira; a edição mantém o input nativo existente.
- Os accessors continuam lendo o valor original. A comparação de datas usa
  o instante, inclusive com offsets diferentes, nunca o texto brasileiro.
- Nenhuma mudança na API, schemas, migrations, queries ou dados de produção.
- Nenhuma coluna nova e nenhuma mudança na ordenação padrão: isso é a #69.
  O histórico continua na ordem do ledger, com paginação no servidor.

## Verificações automatizadas

- `bun install --frozen-lockfile`: dependências do lockfile, sem alterá-lo.
- `bun run test:format`: **26/26 casos**; repetidos com sucesso em `UTC`,
  `America/Sao_Paulo` e `Pacific/Kiritimati`.
- `bun run check`: passou com lint, TypeScript, suíte de contrato existente,
  testes de formatação, build do cliente/worker e simulação de deploy.
- `git diff --check`: sem erros de whitespace.

Os testes novos usam assertions do Node e `tsx`, já existente. Não há Vitest,
framework de testes novo ou testes automatizados de React. A inclusão do helper
puro no projeto TypeScript dos testes permite verificar seus tipos sem
importá-lo no runtime do worker.

## Verificação funcional local

Banco novo e isolado em `.wrangler/formatacao-68/state`, com as cinco migrations
existentes e fixtures fictícias criadas pelas APIs autenticadas locais.
O banco anterior não foi resetado; nenhuma escrita remota foi feita.

- [x] Lista de doadores mostra `(11) 99999-9999` e `(11) 3234-5678`.
- [x] Telefone internacional permanece identificável no formato original.
- [x] Buscar `+551132345678` encontra o fixo, apesar da apresentação formatada.
- [x] Lista e detalhe de beneficiário mostram `(21) 98765-4321`.
- [x] Editar exibe o E.164 original; Cancelar restaura a apresentação formatada.
- [x] Edição do nome de doador mantém o telefone cru na API depois de salvar.
- [x] Histórico mostra `30/09/2026` para `2026-10-01T01:30:00Z`, no fuso de
  São Paulo, e `02/10/2026` para `2026-10-02T12:00:00Z`.
- [x] Detalhe de doação mostra `30/09/2026`; ao editar, o input nativo contém
  `2026-09-30`. Salvar somente a observação preserva o instante original
  `2026-10-01T01:30:00.000Z` na API, sem substituir pelo início do dia.
- [x] Detalhe de entrega mostra `02/10/2026`.
- [x] O histórico mantém a sequência do ledger, sem reordenar páginas no cliente.

## Roteiro para repetir

Com a aplicação local autenticada e dados fictícios disponíveis:

1. Abrir `/contacts/donors` e `/contacts/beneficiaries`. Conferir fixo e celular.
2. Abrir um contato, alternar entre Editar e Cancelar e verificar que só muda
   a apresentação do telefone. Editar outro campo, salvar e conferir o E.164
   no GET autenticado do contato.
3. Abrir `/inventory/ledger` e comparar a coluna Quando com o `occurredAt`
   do GET, levando em conta o fuso local.
4. Abrir uma doação/entrega: no detalhe a data é brasileira; ao editar continua
   no campo nativo. Salvar outro campo sem mudar a data e conferir que o GET
   devolve o mesmo instante ISO.
5. Rodar `bun run test:format` e `bun run check`.

Os arquivos de configuração, runtime Bun, screenshots e fixtures usados nesta
validação estão em `.wrangler/formatacao-68/`, ignorado pelo Git. Não são uma
nova ferramenta do projeto nem entram no commit. Não testar escritas pela
preview: ela compartilha as bindings de produção.
