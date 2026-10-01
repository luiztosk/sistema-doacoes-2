# CLAUDE.md

As instruções deste projeto estão em **[`AGENTS.md`](./AGENTS.md)**. Leia esse
arquivo e siga-o; este é apenas um ponteiro para evitar duas cópias divergindo.

Comece por [`docs/README.md`](./docs/README.md) para saber qual documento é a
fonte da verdade de cada assunto.

As duas armadilhas que mais custam tempo aqui, resumidas:

1. `organization_id` **não existe** nas tabelas de domínio, e a API não filtra
   por organização. O plugin `organization()` do Better Auth está ativo e as
   tabelas de organização existem, mas **não introduza um valor fixo para
   simular** o filtro.
2. O backend está **congelado nesta rodada**: não crie tabela, coluna, endpoint,
   migration nem código de erro, e não edite nada em `src/worker/`. A única
   exceção é registrar `nome-itens` e `categoria-itens`, porque o catálogo
   precisa ser aditivo. **Na branch `feat/redesenho-estoque` esse congelamento
   não vale**: lá mudanças quebrantes são autorizadas, e só as regras de
   segurança e de forma do erro continuam de pé. Para criar telas, leia
   [`docs/frontend-tabela.md`](./docs/frontend-tabela.md) e
   [`docs/frontend-formulario.md`](./docs/frontend-formulario.md).
3. O modelo de estoque **foi implementado** (`inventory_item`, `donation`,
   `delivery`, reserva, contagem e ajuste). `coleta`, `entrega`, `item`,
   `nome_item` e `categoria_item` saíram do banco — **não construa tela para
   elas**, porque não existem mais. Ver
   [`docs/future/README.md`](./docs/future/README.md). `doador` está liberado.
