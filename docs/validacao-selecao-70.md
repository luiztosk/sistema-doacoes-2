# Validação dos campos de catálogo (#70)

Frontend sobre o contrato existente. Sem dependências novas, alterações no
backend ou no banco remoto. A disponibilidade e o teto de quantidade são #71,
não foram implementados nesta etapa.

## O que mudou

- `SearchableSelectField` reutiliza o combobox Base UI gerado, sem modificá-lo.
- Referências a item, doador, beneficiário e categoria têm busca e ordem pt-BR.
  Enums pequenos, como UF e unidade, continuam no select simples.
- Busca por trecho sem acento/caixa, com a mesma normalização das tabelas.
- O estado guarda somente o id; nomes duplicados não confundem registros.
- Sem resultados há mensagem em português. Campo, botão e erro têm associação
  acessível. Teclado é controlado pelo Base UI.
- Itens/quantidades de documentos existentes ficam bloqueados inclusive na
  edição do cabeçalho, respeitando o conteúdo fixo na criação.

## Automatizado

`bun run test:select` roda 155 assertions sem React, rede ou banco, e também
participa de `bun run test`.

Cobertura: normalização Unicode, busca por trecho, ordem natural pt-BR, lista
vazia, cópia sem mutação, fallback durante carga, seleção por id, rótulos
duplicados, 130 itens do catálogo e payloads de doação/entrega validados pelo
contrato. O runner de API não foi alterado.

## Conferência no navegador local

Banco isolado em `.wrangler/formatacao-68/state`, somente fixtures fictícios.
Nenhum cookie ou senha foi incluído nos arquivos versionados.

- Catálogo com 131 opções (130 itens mais o fixture), todas em ordem alfabética
  pt-BR, conferidas na lista renderizada.
- `ARROZ` filtrou os dois itens de arroz; `ACUCAR` encontrou
  "Açúcar refinado pacote 1kg"; termo inexistente mostrou estado vazio.
- `AGATA` encontrou "Ágata QA busca"; `ALVARO` encontrou "Álvaro QA busca";
  `HIGIENE` filtrou "Produtos de Higiene" na categoria do novo item.
- Setas e Enter selecionaram contatos e itens. Escape fechou o popup.
- Criadas uma doação e uma entrega pelo formulário. GET autenticado local
  confirmou ids de contato/item e quantidade 1, não nomes no payload.
- Edição de entrega: cabeçalho habilitado, item/quantidade/remoção bloqueados.
  Cancelar restaurou o beneficiário anterior e o modo somente leitura.
- `bun run check`: lint, tipos, quatro suítes, build e dry-run aprovados.
- Doador obrigatório sem seleção: `aria-invalid=true` e
  `aria-describedby=donorId-error`, apontando para a mensagem visível.

## Roteiro para repetir

1. Abrir Nova doação, buscar um doador e selecionar com setas + Enter.
2. Adicionar item, digitar `arroz` ou `acucar` e conferir os resultados.
3. Limpar a busca: opções devem voltar em ordem alfabética.
4. Digitar algo inexistente, conferir a mensagem e fechar com Escape.
5. Selecionar item, informar quantidade e cadastrar; conferir o detalhe.
6. Repetir em Nova entrega com estoque local disponível.
7. Abrir documento existente, Editar e Cancelar: conteúdo não deve mudar.
