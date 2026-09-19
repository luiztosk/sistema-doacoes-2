# Adaptações dos fluxos para o PI II

Este documento traduz os fluxos do PI I para a arquitetura atual sem definir
prematuramente contratos de API. Os nomes e formatos finais dos endpoints devem
ser decididos quando cada fluxo for implementado e testado contra o schema
Drizzle vigente.

## Estado atual do PI II

Em 18/09/2026, no commit `5b3d005` da `main`:

- o schema Drizzle/D1 já contém assistido, doador, categoria/nome de item,
  coleta, entrega e item;
- as tabelas de domínio possuem `organization_id`;
- o Better Auth e o plugin Organization estão configurados no backend;
- a API expõe somente consultas provisórias de assistidos (`GET /api/` e
  `GET /api/:id`), ainda sem autenticação, autorização ou filtro por
  organização;
- o frontend continua sendo a tela de exemplo do Vite, sem roteamento e sem os
  fluxos do legado;
- TanStack Router/Table, shadcn/ui e better-auth-ui constam apenas no plano de
  UI e ainda não são dependências do projeto.

## Matriz de migração

| Área | PI I | Adaptação necessária no PI II |
|---|---|---|
| Renderização | Flask + Jinja, páginas no servidor | React SPA; manter os caminhos mentais do usuário em rotas protegidas |
| Backend | Rotas Flask misturam tela, regra e persistência | Hono deve expor operações de domínio; React cuida da apresentação |
| Persistência | SQLAlchemy + SQLite local | Drizzle ORM + Cloudflare D1, já iniciados |
| Identificadores | Inteiros | IDs `text`/UUID conforme o schema atual |
| Instituição | `instituicao_id = 1` ao criar coleta/entrega | Derivar `organization_id` exclusivamente da sessão ativa |
| Autenticação | Flask-Security e `auth_required()` | Better Auth; exigir sessão em todas as rotas de domínio |
| Autorização | Não há verificação por papel nas rotas analisadas | Aplicar papel e organização no backend, não apenas ocultar botões |
| Endereço | Um campo livre | Campos estruturados do schema novo e preenchimento opcional via ViaCEP |
| Tabelas | Grid.js com busca, ordenação e paginação no cliente | Reproduzir essas capacidades com componentes React acessíveis |
| Formulários | Flask-WTF e POST de formulário | Formulários React com validação no cliente e novamente no Hono |
| Exclusão | Link `GET` executa remoção | Usar operação mutável explícita, autorização e confirmação na interface |
| Coleta/entrega | Registro é criado assim que o usuário inicia o fluxo | Evitar registros órfãos: salvar de forma atômica ou usar rascunho explícito |
| Itens | Inclusão cria uma nova linha a partir do catálogo | Separar catálogo (`nome_item`) de item físico rastreável |
| Estoque | Estados existem no modelo, mas não são atualizados pela UI | Implementar e testar transições válidas de status |

## Regras que precisam ser preservadas

1. O usuário parte da pessoa relacionada: doador → coleta; assistido → entrega.
2. Também existem listas gerais para auditoria e consulta operacional.
3. Todas as listas precisam de busca, ordenação e paginação.
4. Fichas abrem primeiro em modo de leitura e explicitam a entrada em edição.
5. O histórico de coletas/entregas deve ser acessível pela ficha da pessoa.
6. Os itens devem conservar a rastreabilidade entre origem e destino.

## Correções obrigatórias em relação ao legado

### Isolamento por organização

- Nunca aceitar `organization_id` enviado pelo cliente como fonte de verdade.
- Obter a organização ativa da sessão.
- Filtrar lista e acesso por ID usando `organization_id`.
- Validar que toda entidade relacionada pertence à mesma organização.
- Cobrir 401, 403 e tentativa de acesso cruzado em testes automatizados.

### Ciclo do item

O comportamento desejado documentado no schema atual é:

```text
item registrado para coleta -> AGUARDA_COLETA
coleta concluída            -> EM_ESTOQUE
item selecionado na entrega -> ENTREGUE
```

Para manter a rastreabilidade, uma entrega deve selecionar itens físicos em
`EM_ESTOQUE`; não deve criar cópias a partir de `nome_item`. A operação precisa
preservar `coleta_id` e `doador_id` e acrescentar `entrega_id` e `assistido_id`.

Decisões ainda necessárias antes da implementação:

- se coleta e entrega terão estados próprios (`rascunho`, `concluída`,
  `cancelada`);
- como desfazer/cancelar uma operação sem corromper o estoque;
- se itens iguais serão rastreados individualmente ou por quantidade/lote;
- como tratar doações sem doador identificado e entregas emergenciais sem
  assistido previamente cadastrado.

### Privacidade e papéis

Os slides sugerem dois níveis, enquanto `docs/seguranca.md` propõe os papéis
`owner`, `admin`, `staff` e `viewer` sobre o Better Auth. O grupo precisa
aprovar e configurar uma matriz de permissões antes de implementar as telas.
Até lá, a documentação não afirma que o RBAC está pronto.

Dados socioeconômicos do assistido devem aparecer apenas para papéis autorizados.
Listas operacionais devem expor o mínimo necessário. Dados reais não devem ser
usados em seed, testes, screenshots ou vídeos.

### Acessibilidade

- usar navegação semântica e títulos em ordem lógica;
- associar `label` a todos os campos;
- manter foco visível e operação completa por teclado;
- anunciar erros e sucessos com região `aria-live`;
- fornecer nome acessível a busca, paginação e botões de ícone;
- testar manualmente com teclado/leitor de tela e automatizar verificações onde
  fizer sentido.

## Proposta de rotas de tela, não de endpoints

Os caminhos abaixo servem para organizar a SPA. Eles não constituem contrato de
API:

```text
/login
/
/assistidos
/assistidos/novo
/assistidos/:id
/assistidos/:id/editar
/assistidos/:id/entregas
/doadores
/doadores/novo
/doadores/:id
/doadores/:id/editar
/doadores/:id/coletas
/coletas
/coletas/:id
/entregas
/entregas/:id
/estoque
```

O fluxo `nova coleta`/`nova entrega` pode ser modal ou rota própria. A decisão
deve considerar salvamento atômico, retorno/cancelamento e acessibilidade.

## Critérios para considerar a futura implementação pronta

- [ ] Fluxos de assistido e doador preservam consulta, criação, edição e
      histórico.
- [ ] Coleta adiciona itens ao estoque sem criar registros órfãos.
- [ ] Entrega consome somente itens elegíveis do estoque e preserva sua origem.
- [ ] Todas as operações são autenticadas, autorizadas e isoladas por
      `organization_id`.
- [ ] Busca, ordenação e paginação funcionam com volume de dados realista.
- [ ] Estados de carregamento, vazio, erro e sucesso são acessíveis.
- [ ] Testes cobrem transições de status, acesso cruzado e cancelamento.
- [ ] Nenhuma afirmação marcada apenas como “proposta” nos slides é tratada como
      concluída sem código e teste correspondentes.
