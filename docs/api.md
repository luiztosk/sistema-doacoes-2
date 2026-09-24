# API Hono — base da issue 14

Esta é a primeira entrega da issue #14. Ela implementa o CRUD de domínio e deixa
um ponto único para a autenticação e o contexto multi-tenant que serão concluídos
na issue #13.

## Estado temporário de autenticação

As rotas ainda não exigem login porque a integração do Better Auth com o Worker
está em andamento. Até ela ser concluída:

- o servidor usa exclusivamente a organização de desenvolvimento `org-1`;
- o cliente não pode enviar nem alterar `organizationId`;
- listagens, consultas por ID, referências e escritas são filtradas por essa
  organização;
- o middleware temporário fica isolado em
  `src/worker/api/organization-context.ts` e deverá ser substituído pelo contexto
  derivado da sessão na issue #13.

Essas rotas não devem ser consideradas prontas para produção antes da issue #13.

## Endpoints

Os recursos disponíveis são `assistidos`, `doadores`, `coletas`, `entregas` e
`itens`.

| Método | Caminho | Resultado |
|---|---|---|
| `GET` | `/api/{recurso}` | Lista os registros da organização |
| `GET` | `/api/{recurso}/:id` | Retorna um registro ou `404` |
| `POST` | `/api/{recurso}` | Cria um registro e retorna `201` |
| `PATCH` | `/api/{recurso}/:id` | Atualiza apenas os campos enviados |
| `DELETE` | `/api/{recurso}/:id` | Exclui e retorna `204` |

Respostas com dados usam o envelope:

```json
{
  "data": {}
}
```

Erros usam o formato:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Assistido não encontrado."
  }
}
```

Os principais códigos são `400` para dados inválidos, `404` para recurso
inexistente, `409` para conflito com registros relacionados e `415` quando o corpo
não é enviado como `application/json`.

## Regras de domínio implementadas

- IDs são UUIDs gerados pelo Worker.
- `id` e `organizationId` são campos controlados pelo servidor.
- Referências a doador, assistido, coleta, entrega e nome de item precisam existir
  na mesma organização.
- Um item novo começa em `AGUARDA_COLETA`.
- A única sequência permitida é
  `AGUARDA_COLETA → EM_ESTOQUE → ENTREGUE`.
- Um item marcado como `ENTREGUE` precisa de `entregaId` e `assistidoId`.
- Exclusões bloqueadas por relacionamentos retornam `409` em vez de expor o erro
  interno do banco.

## Compatibilidade com o protótipo atual

Os endpoints antigos `GET /api/` e `GET /api/:id` continuam funcionando para não
quebrar os botões da tela provisória. Código novo deve usar
`/api/assistidos` e `/api/assistidos/:id`.

## Testes com Insomnia

A coleção versionada em `insomnia/` contém fluxos encadeados de listagem, criação,
consulta, atualização e exclusão para todos os recursos, além de casos negativos.
Cada request possui um script `afterResponse` com assertions.

1. Inicialize e popule o D1 local.
2. Execute `npm run dev`.
3. Importe o arquivo YAML da coleção no Insomnia.
4. Execute a coleção na ordem apresentada pelo Collection Runner.

A própria coleção define `BASE_URL` como `http://localhost:5173` e salva em
variáveis os IDs criados durante a execução.
