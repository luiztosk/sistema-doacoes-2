# Sistema Doações 2

Este é nosso sistema desenvolvido para o Projeto Integrador 2 da Univesp, segundo semestre de 2026.

Nosso objetivo é criar um sistema de cadastro de Assistidos e gerenciamento de Doações, hospedado na nuvem,
pronto para ser usado por uma instituição (nossa parceira é a Paróquia Nossa Senhora das Estrelas, através do
projeto Estrela Solidária, já desenvolvemos um protótipo simples semestre passado e agora a ideia é
reimplementar na nuvem).

Protótipo (apenas rascunho por enquanto) hospedado em: [sd2.tosk.dev](sd2.tosk.dev)

## Para rodar o projeto no seu computador:

1. Clone o repositório numa pasta local
```bash
git clone https://github.com/luiztosk/sistema-doacoes-2.git && cd sistema-doacoes-2
```

2. Instale as dependencias
```bash
npm install
```

3. Inicie o servidor de desenvolvimento com
```bash
npm run dev
```
Pode acessar o app local em: [http://localhost:5173](http://localhost:5173).

## Contribuindo com o projeto (membros do grupo)

1. Me avise pelo Whatsapp pra eu adicionar sua conta como contributor
2. Crie um feature branch específico
3. Faça o push do feature branch (vou dar mais detalhes aqui, preciso lembrar como fizemos no semestre passado)
4. Faça o Pull Request aqui pelo github, pra eu poder fazer o merge
   - podemos subir uma versão de teste separada primeiro, de um commit específico, me avise
   - se estiver tudo certo então faço o merge no main e passa a ser a versão oficial
    > configurei o Cloudflare Worker pra assim que altero o main, ele já builda e faz o deploy


## Planejamento do "tema" do projeto, ou seja, quais ferramentas e frameworks serão usados

Eu tinha falado em usar o Next.js, porém hoje pesquisei mais a fundo e resolvi que o framework Hono será uma 
escolha mais acertada no Cloudflare. Ele lida tanto com o backend/API quanto renderiza HTML também. 
Porém para definir o uso de API, e tbm pq o próprio guia do CF já faz assim, podemos usar uma SPA 
(single page application, um webapp) em React no frontend, e fazer as chamadas a essa API.

Além disso, no exempo tbm é usado o Vite, que é uma ferramenta que ajuda no build, e vai ser útil pq já 
podemos usar tbm o Vitest, que é uma ferramenta de testes.

- framework backend/API: Hono
- framework frontend: React SPA
- nuvem: Cloudflare Workers
- banco de dados: Cloudflare D1
- controle versão: git + GitHub
- testes: Vitest

## Materiais para estudo / referência bibliográfica

Pra quem está participando da parte mais técnica como o Leo, esse Hono é baseado no Express.js porém é bem mais simples de usar, é integrado no Cloudflare e já inclui alguns middleware, facilita bastante.

[Se quiserem saber mais sobre o Hono](https://www.youtube.com/watch?v=1XyL9cbFooE&t=72s)

[O guia oficial do Hono no Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/)

[Guia dessa stack nos docs do Hono](https://hono.dev/docs/getting-started/cloudflare-workers-vite)

Não encontrei materiais em Português, mas acredito que tenha algo, e se encontrarem algum tutorial de Express.js, a forma de escrever as rotas é parecido.

A parte de acessibilidade deixei em aberto, podemos pensar nisso no decorrer do projeto, e pode inclusive entrar naquela agenda quinzenal um momento só pra ver isso. E como já temos o protótipo do semestre anterior, dá pra alguém escrever um Guia do Usuário, pois as telas serão parecidas.

## Projeto anterior em Flask e SQLite

[repositório](https://github.com/LuisGabriel01/sistema-doacoes)

seguiremos o fluxo de telas -> [video demonstração](https://www.youtube.com/watch?v=8LkkXIC9ppg)
