# Validação de doadores — #60 e #62

Verificação realizada em 03/10/2026, na branch `feat/doadores-60-62`.
Base: `feat/tabela-filtro-paginacao`, commit `4777cd1`. As duas issues foram
implementadas juntas conforme o alinhamento com Luiz, reaproveitando os
componentes genéricos dessa base.

## Escopo

- Lista, criação, visualização e edição dos 10 campos existentes de doador.
- Busca sem acento, filtro exato por UF, ordenação e paginação no cliente.
- `page`, `pageSize` e `sort` na URL da lista; retorno do detalhe via
  `state.lista`, sem query string na URL do registro.
- Nenhuma alteração no worker, schema, migrations, autenticação ou multi-tenant.
- Sem exclusão, ViaCEP ou novas telas de estoque.

## Ambiente

Somente `localhost:5173`, com persistência D1 separada em
`.wrangler/doadores-qa/state`. A migração existente e o gerador de seed do
projeto foram usados para criar 25 doadores e 100 assistidos; mais dois
doadores fictícios foram cadastrados pela interface. O banco local anterior
foi preservado. Não houve escrita remota.

As dependências foram reinstaladas pelo `package-lock.json`, sem alteração
do manifesto ou do lockfile. `npm run check` passou: lint sem avisos, **28/28
testes da API**, TypeScript, build do cliente/worker e simulação de deploy
(`wrangler deploy --dry-run`). Nenhum deploy foi realizado.

## Verificação no navegador

- [x] Menu Doadores, quatro colunas de dados e botão de detalhes.
- [x] Lista padrão ordenada por nome; campos nulos exibidos como `—`.
- [x] Cadastro somente com nome e cadastro com todos os campos.
- [x] Número textual (`12A` e `s/n`) preservado, sem conversão numérica.
- [x] Campos travados na visualização; Editar libera; Cancelar descarta mudanças.
- [x] Nome vazio/em branco, e-mail inválido e CEP com 7 dígitos ou traço
      mostram validação em português e bloqueiam o envio.
- [x] Seleção oferece as 27 UFs, com siglas maiúsculas.
- [x] Edição persiste; limpar campos opcionais produz valores vazios no
      formulário e `—` na lista, inclusive depois de recarregar.
- [x] Novo cadastro retorna à primeira página; edição retorna à página de origem
      e apresenta o valor atualizado sem exigir F5.
- [x] Busca `Victor` encontra `Víctor`; `Brasilia` encontra `Brasília`.
- [x] Filtro SP mostra somente doadores de SP; busca sem resultado mostra
      `Nenhum doador encontrado.`.
- [x] Ordenar por nome ou telefone na terceira página retorna à primeira.
- [x] Telefone/e-mail vazios ficam no fim nas ordens crescente e decrescente.
- [x] Abertura direta e recarga de `?page=2&pageSize=10` mantêm a terceira página.
- [x] `?page=99&pageSize=10` retorna à primeira; `?page=abc&sort=lixo`
      usa a visão padrão sem tela de erro.
- [x] Clique na linha e em Mais detalhes abre `/doadores/id/<id>` sem query;
      Voltar preserva página, tamanho e ordenação, inclusive após recarga do detalhe.
- [x] Busca, filtro, tamanho de página, paginação e ordenação com a lista montada
      não fazem novo GET de doadores: contador local de requisições ficou em
      **5 antes e 5 depois** da sequência, sem navegação para outras telas.
- [x] Registro inexistente mostra mensagem de erro, sem tela branca.
- [x] Falha de rede simulada ao salvar mantém a rota e o texto digitado;
      erro vai para o console, conforme o padrão atual do projeto.
- [x] Lista e filtro de tipo de imóvel de Assistidos continuam funcionando.

Na revisão do código, o estado/payload de POST e PATCH contém os 10 campos,
sem `id`; o identificador é passado separadamente na atualização. A ordem
de envio é `mutateAsync` → `invalidateQueries` → navegação.

## Ajustes de integração

O exemplo de botão de detalhes lia `useListView()` dentro da lista, mas esse
hook lê o estado recebido pela navegação, não os parâmetros atuais da lista.
Doadores envia a prop `view` atual através de um contexto local, para o botão
e a linha voltarem à mesma página mesmo em abertura direta da lista.

O filtro compartilhado agora informa `items` ao Select: o rótulo inicial é
`Todos`, não o valor interno `every`. A seleção de `Próprio` em Assistidos
também foi conferida após esse ajuste.

Não foram adicionados testes automatizados de React, conforme o escopo das
issues e o runner de API definido em `AGENTS.md`.
