# Validação da ordenação (#69)

Implementação somente no frontend. Nenhum endpoint, migration ou banco remoto
foi alterado. Branch local empilhada sobre a #68.

## Automatizado

- `bun run test:table`: 189 assertions, sem React, rede ou banco.
- Políticas das oito tabelas, colunas válidas, formato exato de `sort`,
  parâmetros inválidos, round-trip da URL, fallback e comparação pt-BR.
- Suítes de contrato e formatação mantidas no gate.

## Conferência local no navegador

Banco isolado em `.wrangler/formatacao-68/state`, somente dados fictícios:
26 doadores, 131 itens (130 do catálogo mais um fixture), documentos com datas
inseridas fora de ordem e movimentos correspondentes no ledger.

- Oito listas abertas diretamente: padrão explícito na URL e `aria-sort`
  coerente. Contatos/catálogo/saldo alfabéticos; documentos de 21/10, 12/10
  e 03/10 em ordem decrescente; ledger em sequência crescente.
- Doadores: clique em Nome inverte a ordem; F5 preserva; próxima página
  grava `page=1`; detalhe e Voltar preservam página e `name.desc`.
- Catálogo de itens: link com `page=1&pageSize=10&sort=name.desc`, detalhe e
  retorno preservados. Categorias: retorno preserva `name.desc`.
- Doações: `sort=nome.asc` corrigido para `occurredAt.desc`, sem aviso de
  coluna inexistente.
- `bun run check`: lint, tipos, suítes, build e dry-run aprovados.
- Ordenar por Cidade a partir da segunda página remove `page` e grava
  `sort=cityLabel.asc`.

## Roteiro para repetir

1. Com sessão local válida, abrir cada lista pelo menu e conferir o padrão.
2. Ordenar uma coluna, avançar a página, recarregar e copiar o link.
3. Abrir um detalhe e voltar: página, tamanho e direção devem permanecer.
4. Trocar de coluna na segunda página: deve voltar para a primeira.
5. Colar `?sort=nome.asc`: deve corrigir para o padrão do recurso.
6. No histórico, conferir sequência crescente mesmo com datas retroativas.

Busca/filtros continuam locais e não são persistidos na URL. O ledger continua
paginado pelo servidor, sem controles que reordenem somente a página recebida.
