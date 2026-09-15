# Contrato da API HTTP

Este documento define o contrato inicial da API do Sistema Doações 2. Ele deve
orientar a implementação do CRUD antes de as rotas serem criadas. Os nomes dos
campos de domínio e suas regras vêm de [modelos-db.md](./modelos-db.md); as
regras de isolamento vêm de [seguranca.md](./seguranca.md).

> Status: proposta para a issue #29. As rotas abaixo só entram em produção
> depois do schema Drizzle, do Better Auth e do middleware de organização.

## Convenções

- Base das rotas da aplicação: `/api/v1`.
- Autenticação e organizações: Better Auth, montado em `/api/auth/*`. Essas
  rotas são do Better Auth e não devem ser reimplementadas pelo CRUD.
- O cliente envia o cookie de sessão em toda chamada autenticada
  (`credentials: "include"`). O servidor extrai da sessão a organização ativa
  e o papel do membro.
- `organization_id` **não** é aceito no corpo, na query string nem na URL das
  rotas de domínio. Ele é derivado exclusivamente da sessão.
- IDs são UUIDs em texto. Datas enviadas e retornadas pela API usam ISO 8601 em
  UTC, por exemplo `2026-09-15T22:00:00.000Z`; a persistência pode convertê-las
  para timestamp.
- Valores monetários inteiros são em centavos (`valorAluguel: 125000` significa
  R$ 1.250,00). O campo `renda` mantém o tipo decimal descrito no modelo de
  dados até que o modelo seja revisado.
- Listas são paginadas por `page` (padrão `1`) e `pageSize` (padrão `20`, máximo
  `100`). Os filtros específicos de cada recurso são opcionais.

O endpoint atual `GET /api/`, que retorna a tabela demonstrativa `Customers`,
é apenas uma prova de integração D1/Drizzle. Ele não faz parte deste contrato e
deve ser retirado quando a primeira rota de domínio estiver disponível.

## Formato das respostas

Uma leitura de coleção retorna:

```json
{
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 0 }
}
```

Uma leitura, criação ou alteração de registro retorna o objeto em `data`:

```json
{ "data": { "id": "uuid" } }
```

Erros retornam sempre um objeto sem detalhes internos do banco:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Há campos inválidos.",
    "details": [{ "field": "cep", "message": "CEP deve ter 8 dígitos." }]
  }
}
```

## Sessão e organização ativa

| Método e caminho | Uso |
| --- | --- |
| `GET /api/v1/me` | Informa o usuário autenticado, seu papel e a organização ativa para a SPA. |
| `/api/auth/*` | Login, logout, sessão, listagem/troca de organização e convites, conforme o cliente Better Auth + plugin Organization. |

Antes de qualquer rota de domínio, o middleware deve confirmar: sessão válida,
`activeOrganizationId` definido e associação do usuário à organização ativa. A
troca de organização usa a operação `organization.setActive` do Better Auth; a
API de domínio não recebe uma organização escolhida pelo cliente.

## Recursos de domínio

Os métodos abaixo exigem organização ativa. `:id` sempre é buscado junto com
`organization_id`; um ID de outra organização deve resultar em `404`, sem
revelar que o registro existe.

### Assistidos e doadores

| Método | Caminho | Ação |
| --- | --- | --- |
| `GET` | `/assistidos` | Lista assistidos; filtros: `q`, `cidade`, `uf`. |
| `POST` | `/assistidos` | Cadastra um assistido. |
| `GET` | `/assistidos/:id` | Exibe um assistido. |
| `PATCH` | `/assistidos/:id` | Atualiza campos informados. |
| `DELETE` | `/assistidos/:id` | Desativa/arquiva o assistido; a exclusão física fica proibida no MVP. |
| `GET` | `/doadores` | Lista doadores; filtros: `q`, `cidade`, `uf`. |
| `POST` | `/doadores` | Cadastra um doador. |
| `GET` | `/doadores/:id` | Exibe um doador. |
| `PATCH` | `/doadores/:id` | Atualiza campos informados. |
| `DELETE` | `/doadores/:id` | Desativa/arquiva o doador; a exclusão física fica proibida no MVP. |

Os corpos usam os campos definidos no schema. Exemplo mínimo de assistido:

```json
{
  "nome": "Maria da Silva",
  "telefone": "11999999999",
  "cep": "01001000",
  "logradouro": "Praça da Sé",
  "numero": "10",
  "bairro": "Sé",
  "cidade": "São Paulo",
  "uf": "SP"
}
```

Os campos socioeconômicos só aparecem nas respostas de detalhe e só para papéis
autorizados. Logs, mensagens de validação e ambientes de demonstração não podem
conter dados reais de assistidos.

### Catálogo de itens

| Método | Caminho | Ação |
| --- | --- | --- |
| `GET`, `POST` | `/categorias-itens` | Lista ou cria categorias. |
| `PATCH`, `DELETE` | `/categorias-itens/:id` | Renomeia ou arquiva categoria sem itens vinculados. |
| `GET`, `POST` | `/nomes-itens` | Lista ou cria nomes de item; aceita filtro `categoriaId`. |
| `PATCH`, `DELETE` | `/nomes-itens/:id` | Atualiza ou arquiva nome de item sem movimentações vinculadas. |

Na criação de nome de item, `categoriaId` é obrigatório e deve pertencer à
organização ativa. Assim, não há referência cruzada entre instituições.

### Coletas, entregas e estoque

| Método | Caminho | Ação |
| --- | --- | --- |
| `GET`, `POST` | `/coletas` | Lista ou registra uma coleta. Filtros: `doadorId`, `from`, `to`. |
| `GET` | `/coletas/:id` | Exibe coleta e seus itens. |
| `PATCH` | `/coletas/:id` | Corrige dados antes de a coleta ser finalizada. |
| `GET`, `POST` | `/entregas` | Lista ou registra uma entrega. Filtros: `assistidoId`, `from`, `to`. |
| `GET` | `/entregas/:id` | Exibe entrega e seus itens. |
| `PATCH` | `/entregas/:id` | Corrige dados antes de a entrega ser finalizada. |
| `GET` | `/itens` | Consulta o estoque. Filtros: `nomeId`, `status`, `coletaId`, `entregaId`. |
| `GET` | `/itens/:id` | Exibe histórico do item. |
| `POST` | `/itens` | Registra item aguardando coleta. |

As transições de estoque são operações de negócio, não edição livre de
`status`:

| Método | Caminho | Transição |
| --- | --- | --- |
| `POST` | `/itens/:id/registrar-coleta` | `AGUARDA_COLETA` → `EM_ESTOQUE`; recebe `coletaId`. |
| `POST` | `/itens/:id/registrar-entrega` | `EM_ESTOQUE` → `ENTREGUE`; recebe `entregaId`. |

O servidor valida que coleta/entrega, doador/assistido e item pertencem à mesma
organização, e faz a atualização do item de forma atômica. Não existe endpoint
para voltar um item de `ENTREGUE` diretamente a outro estado no MVP; correções
exigem operação administrativa auditável, a ser especificada depois.

## Autorização proposta

| Papel | Permissão |
| --- | --- |
| `viewer` | Somente leitura, exceto dados socioeconômicos restritos. |
| `staff` | Leitura, cadastro e atualização operacional de assistidos, doadores, catálogo, coletas, entregas e itens. |
| `admin` | Permissões de `staff`, arquivamento e gestão da instituição. |
| `owner` | Permissões de `admin`, inclusive convites e configuração da instituição. |

A autorização é conferida no backend para cada operação. O frontend pode ocultar
ações indisponíveis, mas isso não substitui a conferência no middleware.

## Códigos de resposta

| Status | Código | Quando ocorre |
| --- | --- | --- |
| `200` | — | Consulta ou atualização bem-sucedida. |
| `201` | — | Recurso criado. |
| `204` | — | Arquivamento bem-sucedido, sem corpo. |
| `400` | `BAD_REQUEST` | Parâmetro, formato ou transição de estado inválida. |
| `401` | `UNAUTHENTICATED` | Sessão ausente, inválida ou expirada. |
| `403` | `FORBIDDEN` | Sessão válida sem organização ativa ou sem papel permitido. |
| `404` | `NOT_FOUND` | Recurso inexistente ou fora da organização ativa. |
| `409` | `CONFLICT` | Duplicidade ou tentativa de arquivar registro com dependências. |
| `422` | `VALIDATION_ERROR` | Corpo válido como JSON, mas falha nas regras de domínio. |
| `500` | `INTERNAL_ERROR` | Falha inesperada; detalhes ficam somente na observabilidade. |

## Dependências para implementação

1. A issue #11 precisa substituir a tabela demonstrativa pelo schema Drizzle de
   domínio, migrations e rotas `/api/auth/*`.
2. A issue #13 precisa expor no contexto do Hono o usuário, a organização ativa
   e o papel já validados.
3. A issue #14 implementa estas rotas usando validação de entrada e consultas
   sempre filtradas por `organization_id`.
4. A issue #30 cria o cliente React usando este contrato e `credentials:
   "include"`.

## Decisões ainda necessárias

- Confirmar a política de arquivamento no schema (`ativo`, `arquivadoEm` e/ou
  `arquivadoPor`), pois as tabelas atuais ainda não têm esses campos.
- Definir se `renda` passará a ser centavos antes da migration inicial, para
  evitar dinheiro em ponto flutuante.
- Definir a regra de cancelamento/estorno de coletas e entregas com histórico de
  auditoria antes de ela ser disponibilizada ao usuário.
