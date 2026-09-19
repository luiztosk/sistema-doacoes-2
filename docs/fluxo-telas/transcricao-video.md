# Transcrição visual do vídeo do PI I

Vídeo: [Projeto Integrador I — Grupo DRP05 — Turma 03](https://www.youtube.com/watch?v=8LkkXIC9ppg)

Esta não é uma transcrição de fala. O vídeo usa música de fundo e apresenta o
conteúdo por slides e por uma gravação de tela. A linha do tempo abaixo descreve
o que é legível e o que acontece na interface, omitindo dados pessoais e
credenciais exibidos durante a demonstração.

Os tempos são aproximados e os links abrem o vídeo no trecho correspondente.

## Apresentação

### [00:00–00:18 — Abertura](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=0s)

- Identifica o Projeto Integrador I, o grupo, a turma, o orientador e os
  integrantes.
- Os registros acadêmicos individuais foram omitidos desta transcrição.

### [00:18–00:38 — Rede de proteção](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=18s)

- Apresenta três frentes de atuação de comunidades de fé:
  acolhimento/suporte emocional, promoção social/capacitação e assistência
  emergencial.
- Delimita o projeto à logística de distribuição de bens essenciais, como
  alimentos, roupas e medicamentos.

### [00:38–01:14 — Problema](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=38s)

- Descreve uma gestão analógica baseada em cadernos sem padronização, planilhas
  isoladas, folhas soltas e trabalho voluntário com alta rotatividade.
- Aponta três consequências: desperdício de itens perecíveis, duplicidade ou
  omissão de atendimentos e exposição indevida de dados de famílias assistidas.

### [01:14–01:34 — Fundamentos](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=74s)

- Relaciona a intervenção tecnológica à transparência, rastreabilidade,
  auditoria e eficiência operacional.
- Define como objetivo eliminar trabalho administrativo manual e preservar a
  integridade e a segurança da informação.

### [01:34–01:54 — Metas](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=94s)

1. Diagnosticar gargalos e requisitos com os colaboradores da instituição.
2. Construir um sistema web CRUD leve para controlar o histórico de donativos.
3. Implantar a solução e capacitar os voluntários, inclusive os com pouca
   familiaridade digital.

### [01:54–02:15 — Escolhas tecnológicas do PI I](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=114s)

- Interface simplificada para usuários não técnicos.
- Backend em Python/Flask com SQLAlchemy.
- Persistência local em SQLite.
- Gestão financeira complexa declarada fora do escopo; o foco apresentado é o
  inventário e o atendimento das famílias.

### [02:15–02:52 — Modelo conceitual](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=135s)

- Famílias assistidas: dados demográficos, endereço e indicadores de
  vulnerabilidade.
- Donativos/inventário: tipos de bens, entradas, saídas e validade.
- Histórico de atendimento: associação entre família, item recebido e data.
- O slide propõe um alerta de periodicidade baseado na última doação para
  reduzir duplicidades.

> **Proposto, não demonstrado:** CPF, prazo de validade e alerta automático não
> aparecem na demonstração prática e não estão implementados no modelo legado
> analisado.

### [02:52–03:13 — Validação na instituição](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=172s)

- Informa que o fluxo foi validado com o responsável pelas ações sociais da
  Paróquia Nossa Senhora das Estrelas, em Itapetininga/SP.
- Registra aprovação do fluxo digital em substituição às fichas físicas.
- Destaca privacidade e segurança dos dados coletados nas visitas como a
  principal preocupação recebida no feedback.

### [03:13–03:34 — Governança de dados](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=193s)

- Propõe controle de acesso baseado em papéis, com um nível operacional para
  voluntários e um nível administrativo para o responsável da instituição.
- O nível operacional veria apenas dados necessários à entrega; o nível
  administrativo teria acesso aos dados sensíveis do atendimento.
- Defende autenticação individual para evitar credenciais compartilhadas.

> **Proposto, não demonstrado:** o vídeo mostra apenas um login e não comprova
> restrições diferentes por papel. O código legado analisado exige autenticação,
> mas não aplica autorização por perfil nas rotas de domínio.

### [03:34–03:55 — Síntese](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=214s)

- Compara registros físicos frágeis com informação digital pesquisável.
- Contrasta a consulta manual do histórico com um alerta automático de
  periodicidade.
- Contrasta o controle físico de acesso com acesso digital por perfis.

### [03:55–04:12 — Considerações finais](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=235s)

- Apresenta a solução local em Flask/SQLite como uma base de baixo custo.
- Indica uma futura migração para a nuvem e uso simultâneo por mais de uma
  unidade como visão de evolução — exatamente o contexto do PI II.

## Demonstração prática

### [04:12–04:40 — Login](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=252s)

- A aplicação bloqueia o conteúdo até a autenticação.
- A tela contém e-mail, senha, opção de lembrar a sessão e botão de entrada.
- Após autenticar, o usuário chega à página inicial.

### [04:40–04:58 — Página inicial](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=280s)

- Exibe quatro entradas principais: Assistidos, Doadores, Coletas e Entregas.
- O cabeçalho mantém ações para voltar ao início e sair.

### [04:58–05:18 — Lista de assistidos](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=298s)

- Mostra botão para adicionar um assistido.
- A tabela permite pesquisa, ordenação e paginação.
- As colunas visíveis incluem nome, contato e um resumo socioeconômico.
- O nome funciona como link para a ficha individual.

### [05:18–05:36 — Ficha do assistido](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=318s)

- A ficha reúne contato, endereço, composição familiar e indicadores
  socioeconômicos.
- No modo de leitura, oferece `Editar`, `Ver Entregas` e `Fazer Nova Entrega`.
- A gravação entra no modo de edição, em que aparecem `Cancelar` e `Salvar`.

### [05:36–05:47 — Histórico de entregas](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=336s)

- `Ver Entregas` abre a lista filtrada para o assistido selecionado.
- Cada entrega mostra identificador, data/hora, assistido e instituição.
- Ao abrir uma entrega, a aplicação mostra os itens ligados a ela; uma das
  consultas demonstradas não possui itens.

### [05:47–06:20 — Doadores](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=347s)

- O menu lateral é usado para abrir a lista de doadores.
- A lista possui adição, pesquisa, ordenação e paginação.
- A ficha do doador mostra contato e endereço e oferece `Editar`, `Ver coletas`
  e `Fazer Nova Coleta`.
- A gravação também exibe o modo de edição do doador.

### [06:20–06:40 — Histórico de coletas](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=380s)

- `Ver coletas` abre a lista de coletas, com data/hora, doador e instituição.
- O identificador abre os itens associados à coleta escolhida.

### [06:40–07:20 — Itens da coleta](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=400s)

- A tabela de itens mostra nome do item e vínculos com doador, instituição,
  assistido, entrega e coleta.
- `Adicionar Item` abre um catálogo pesquisável e paginado com identificador,
  nome e categoria.
- `Adicionar este item` retorna à coleta com uma nova linha; a operação é
  repetida durante a demonstração.
- A tela também apresenta uma ação de remoção da doação.

### [07:20–07:42 — Navegação final](https://www.youtube.com/watch?v=8LkkXIC9ppg&t=440s)

- O menu é usado para voltar às listas gerais de coletas e entregas.
- Uma entrega diferente é aberta e seus itens aparecem ligados tanto à coleta de
  origem quanto à entrega e ao assistido de destino.

## O que a gravação não comprova

- Cadastro completo de uma nova pessoa e persistência do resultado.
- Exclusão de cadastro, item, coleta ou entrega.
- Mudanças automáticas do status de um item.
- Seleção de um item existente em estoque para efetuar uma entrega.
- Bloqueio por perfil, isolamento entre instituições ou auditoria.
- Alertas de validade ou de periodicidade.
- Funcionamento simultâneo em múltiplas instituições.

Esses pontos devem ser verificados no código ou definidos como requisitos do PI
II, e não deduzidos apenas da apresentação.
