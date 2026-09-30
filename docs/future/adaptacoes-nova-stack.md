# Adaptações dos fluxos para o PI II

Este documento traduz os fluxos do PI I para a arquitetura atual sem definir
prematuramente contratos de API. Os nomes e formatos finais dos endpoints devem
ser decididos quando cada fluxo for implementado e testado contra o schema
Drizzle vigente.

## Estado atual do PI II

Atualizado em 29/09/2026 (o retrato original era o commit `5b3d005`, de 18/09/2026):

- o schema Drizzle/D1 já contém assistido, doador, categoria/nome de item,
  coleta, entrega e item;
- **as tabelas de domínio não possuem `organization_id`** — a coluna foi removida
  junto com a integração do Better Auth e volta com a
  [#13](https://github.com/luiztosk/sistema-doacoes-2/issues/13). Ver
  [`../modelos-db.md`](../frozen/modelos-db.md);
- o Better Auth e o plugin Organization estão configurados no backend, e login e
  cadastro funcionam;
- a API expõe CRUD completo dos 5 recursos sob `/api/v1`, **com sessão
  obrigatória** e validação de payload por zod, mas **sem** autorização nem
  filtro por organização. Ver [`../api.md`](../frozen/api.md);
- o frontend usa **TanStack Router** com rotas `/auth/login`, `/auth/signup` e
  `/auth/logout`. A única tela de dados é `/assistidos`, que lista os
  assistidos em uma tabela. Ainda **não** existem telas dos fluxos do legado:
  sem ficha, sem criação, sem edição e sem busca, ordenação ou paginação;
- a navegação é um **menu lateral**, como o do legado
  ([`fluxos.md`](../archive/fluxos-pi1.md)), com "Início" e uma entrada por recurso. A lista
  vive em um lugar só, [`src/react-app/lib/navigation.ts`](../../src/react-app/lib/navigation.ts),
  tipada contra a árvore de rotas gerada: acrescentar uma tabela é criar o
  arquivo da rota e somar uma linha ali. O cabeçalho das telas autenticadas é o
  do shell (`_authenticated.tsx`) e o das públicas é separado, então nenhuma
  tela tem dois cabeçalhos;
- TanStack Router, TanStack Query e shadcn/ui **são** dependências. O
  `better-auth-ui` chegou a ser instalado e foi removido (`1d51dd9`); o shadcn
  foi montado sobre **Base UI**. O `@tanstack/react-table` está instalado e
  usado pela tabela de assistidos, sobre o primitivo `table` do shadcn: o
  TanStack cuida do estado de exibição e o shadcn, da marcação.

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
API. O que existe hoje está marcado. O login e o cadastro usam o prefixo
`/auth`, e cada recurso mora em uma pasta para que lista, ficha, criação e
edição fiquem juntas:

```text
/auth/login          [existe]
/auth/signup         [existe]
/auth/logout         [existe]
/                     [existe, pública, com as instruções de entrada]
/about                [existe, pública, só a partir de /]
/painel              [existe, painel com os recursos]
/assistidos          [existe, só a lista]
/assistidos/novo
/assistidos/$id
/assistidos/$id/editar
/assistidos/$id/entregas
/doadores
/doadores/novo
/doadores/$id
/doadores/$id/editar
/doadores/$id/coletas
/coletas
/coletas/$id
/entregas
/entregas/$id
/estoque
```

`/` e `/about` são públicas e usam o cabeçalho simples. A partir do login, a
tela inicial é `/painel`, que abre em "Início" do menu lateral, e todas as
telas protegidas usam o shell de `_authenticated.tsx`.

`/assistidos` está implementada como
[`src/react-app/routes/_authenticated/assistidos/index.tsx`](../../src/react-app/routes/_authenticated/assistidos/index.tsx):
lista as colunas `nome`, cidade/UF, `telefone`, `email`, `renda`,
`tipoImovel` e `cestaBasica`, com célula vazia para campo nulo. O tipo das
linhas vem de `assistidoSelectSchema`, em `src/worker/db/schema.ts`, e não de
uma lista escrita à mão. O endpoint devolve a tabela inteira — não há
paginação, busca ou ordenação no servidor — então qualquer uma dessas
capacidades nasce no cliente.

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
