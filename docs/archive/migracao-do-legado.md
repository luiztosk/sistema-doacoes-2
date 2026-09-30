# Migração do sistema legado (PI I)

Seção removida de [`../arquitetura.md`](../arquitetura.md). Não é estado atual: é a
descrição do sistema anterior, que já foi traduzido para o Drizzle/D1.

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
