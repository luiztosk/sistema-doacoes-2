# Fluxos de tela do sistema legado

Esta pasta registra o funcionamento do sistema do PI I que deve servir de
referência para as telas do PI II. O objetivo é preservar o fluxo de trabalho,
sem copiar limitações técnicas ou tratar promessas da apresentação como
funcionalidades já implementadas.

## Documentos

- [Transcrição visual do vídeo](./transcricao-video.md): linha do tempo da
  apresentação e da demonstração prática.
- [Síntese dos fluxos](./fluxos.md): mapa das telas e caminhos percorridos pelo
  usuário.
- [Adaptações para a nova stack](./adaptacoes-nova-stack.md): o que pode ser
  mantido, o que precisa mudar e o que ainda não está implementado no PI II.

## Fontes e método

As fontes foram cruzadas para evitar que um dado de demonstração ou uma ideia
dos slides virasse requisito por engano:

1. [Vídeo de apresentação do PI I](https://www.youtube.com/watch?v=8LkkXIC9ppg),
   com duração de 7min42s.
2. [Repositório do PI I](https://github.com/LuisGabriel01/sistema-doacoes),
   branch `main`, commit `7741bd9` de 30/04/2026, último commit anterior à
   publicação do vídeo.
3. Código e documentação do PI II na branch `main`, commit `5b3d005` de
   18/09/2026.

Cada afirmação nos documentos usa uma destas classificações:

- **Demonstrado:** aparece na gravação da interface.
- **Confirmado no legado:** existe nas rotas, templates ou modelos do PI I.
- **Proposto:** aparece apenas nos slides ou em documentação de planejamento.
- **PI II atual:** já existe no código atual do novo sistema.

## Limitações da fonte

O vídeo não contém uma narração inteligível: a trilha é musical e a legenda
automática do YouTube contém palavras sem relação com as telas. Por isso, a
transcrição é **visual e descritiva**, feita a partir dos textos e das ações
observáveis na gravação.

Algumas ações presentes no código legado não são exercitadas no vídeo. Elas são
registradas como “confirmadas no legado”, nunca como “demonstradas”. Dados de
contato, endereços, credenciais e números acadêmicos exibidos na gravação foram
omitidos seguindo o princípio de minimização de dados.

> Nota: `docs/arquitetura.md` cita uma tag `pi1-final`, mas essa tag não existe
> atualmente no repositório legado. As tags disponíveis são `v0.1`, `v0.2` e
> `v0.3`; por isso esta análise fixa explicitamente o commit `7741bd9`.
