# Plano de integração — TanStack Router e Better Auth UI

**Estado:** plano de execução para transformar o frontend atual em uma SPA integrada.

**Contexto:** React 19 + TypeScript + Vite, com Hono/Cloudflare Workers no backend, D1/Drizzle no banco e Better Auth no endpoint `/api/auth`.

Este plano separa a integração em fases pequenas. Cada fase deve ser concluída e validada antes da próxima, evitando acumular erros de contexto, rotas e imports.

---

## 1. Estado atual e problemas a resolver

O frontend atual ainda está baseado no template do Vite:

- [`src/react-app/main.tsx`](../src/react-app/main.tsx) renderiza apenas `<App />`.
- [`src/react-app/App.tsx`](../src/react-app/App.tsx) contém a tela de exemplo, cria um novo `QueryClient()` a cada renderização e referencia um `authClient` inexistente.
- [`src/components/providers.tsx`](../src/components/providers.tsx) configura `ThemeProvider` e o `AuthProvider` do Better Auth UI, mas usa hooks do TanStack Router sem existir um `RouterProvider`.
- Não há route tree, `createRouter`, `RouterProvider` ou rotas de autenticação.
- Os componentes copiados usam imports como `@/lib/auth-client` e `@/lib/utils`, mas os arquivos estão em `src/components/lib/...`.
- O backend Better Auth está configurado em [`src/worker/auth.ts`](../src/worker/auth.ts) com `basePath: "/api/auth"` e somente o plugin `organization()`.
- [`tsconfig.json`](../tsconfig.json) contém `ignoreDeprecations: "6.0"`, incompatível com TypeScript 5.9.3.
- [`tsconfig.app.json`](../tsconfig.app.json) não recebe os aliases `@/*` configurados no tsconfig raiz.

A documentação [`plano-ui-stack.md`](./plano-ui-stack.md) é a referência da stack, mas ainda descreve parte do estado anterior. [`adaptacoes-nova-stack.md`](./fluxo-telas/adaptacoes-nova-stack.md) também está desatualizada e deve ser revisada após a implementação.

---

## 2. Decisões de arquitetura

### 2.1 Manter React + Vite SPA

Não migrar para TanStack Start, Next.js ou SSR. O backend Hono/Cloudflare Workers continua responsável pela API e pela autenticação.

### 2.2 Usar TanStack Router como roteador principal

O TanStack Router deve ser o único roteador da SPA. Ele será responsável por:

- rotas públicas e protegidas;
- parâmetros e search params;
- navegação dos componentes de autenticação;
- redirecionamento após login/logout;
- links internos da aplicação.

### 2.3 Usar um cliente Better Auth no frontend

Criar um módulo dedicado para o cliente de autenticação, por exemplo:

```text
src/lib/auth-client.ts
```

Ele deve usar `createAuthClient` do `better-auth/react` e apontar para a base do backend:

```text
/api/auth
```

Não misturar o endpoint da API (`/api/auth`) com rotas de tela (`/auth`, `/login`, `/settings`).

### 2.4 Usar uma única composição de providers

O `QueryClient` deve ser criado uma vez, fora do componente React. O `RouterProvider` deve envolver o layout que usa `useNavigate()` e `useParams()`.

A ordem conceitual é:

```tsx
<QueryClientProvider client={queryClient}>
  <RouterProvider router={router}>
    <RootLayout>
      <ThemeProvider>
        <AuthProvider authClient={authClient} queryClient={queryClient}>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </RootLayout>
  </RouterProvider>
</QueryClientProvider>
```

O `AuthProvider` do `@better-auth-ui/react` já fornece contexto de autenticação e integração com TanStack Query. Deve ser usado o provider real da biblioteca, não um `AuthProvider` inexistente ou uma configuração desconectada.

### 2.5 Alinhar frontend e backend

O frontend não deve habilitar recursos que o backend não oferece. Antes de ativar username, magic link, email OTP, two-factor, passkey, API key, multi-session, delete-user ou organizations na UI, confirmar a configuração correspondente no servidor Better Auth, no schema/migrations e nas permissões.

---

## 3. Fases de implementação

## Fase 0 — Preparar a base de build

Objetivo: fazer o projeto compilar antes de adicionar novas rotas.

- [ ] Remover ou corrigir `ignoreDeprecations` em `tsconfig.json`.
- [ ] Garantir que `tsconfig.app.json` resolva `@/*` para `./src/*`.
- [ ] Confirmar que `src/lib` e `src/components/lib` sejam incluídos corretamente.
- [ ] Corrigir imports quebrados nos arquivos copiados, especialmente:
  - `@/lib/auth-client`;
  - `@/lib/utils`;
  - `@/lib/auth/*`.
- [ ] Não tentar corrigir erros de rotas antes de resolver aliases e imports.

Critério de conclusão: `npx tsc -p tsconfig.app.json --noEmit` não falha por módulos inexistentes ou configuração incompatível.

---

## Fase 1 — Criar o cliente Better Auth

Objetivo: ter uma única configuração frontend reutilizável pelos providers e componentes.

- [ ] Criar `src/lib/auth-client.ts`.
- [ ] Configurar `createAuthClient` com a base correta do backend.
- [ ] Exportar apenas o cliente necessário para o frontend.
- [ ] Remover referências a `authClient` não importado em `App.tsx`.
- [ ] Definir uma política única para callbacks OAuth e redirects.

Critério de conclusão: o cliente é importado sem erro e consegue chamar o endpoint `/api/auth` durante o desenvolvimento.

---

## Fase 2 — Configurar TanStack Router

Objetivo: substituir a renderização direta de `<App />` por um route tree tipado.

- [ ] Instalar/configurar `@tanstack/router-plugin`, se for adotado o fluxo de rotas geradas.
- [ ] Criar a rota raiz e o layout principal.
- [ ] Criar `createRouter` e exportar a instância usada pelo frontend.
- [ ] Criar `src/react-app/main.tsx` montando `RouterProvider`.
- [ ] Mover o conteúdo atual de `App.tsx` para uma rota pública ou removê-lo temporariamente.
- [ ] Configurar links internos com o `Link` do TanStack Router.

Estrutura mínima sugerida:

```text
src/
  router.tsx
  routes/
    __root.tsx
    index.tsx
    auth/
      sign-in.tsx
      sign-up.tsx
      forgot-password.tsx
      reset-password.tsx
      verify-email.tsx
      callback.tsx
    settings/
      account.tsx
  react-app/
    main.tsx
```

Se o projeto não usar rotas geradas pelo plugin, manter a mesma separação com um route tree criado manualmente; o importante é haver uma única fonte de rotas.

Critério de conclusão: a aplicação abre em `/`, navega entre pelo menos duas rotas sem recarregar a página e não usa mais o sample do Vite como entrada principal.

---

## Fase 3 — Corrigir a composição dos providers

Objetivo: garantir que todos os hooks tenham contexto.

- [ ] Manter `QueryClient` em escopo de módulo ou em factory estável.
- [ ] Montar `RouterProvider` antes de qualquer componente que use `useNavigate()` ou `useParams()`.
- [ ] Mover `ThemeProvider` e `AuthProvider` para o layout raiz ou para um provider renderizado dentro da rota raiz.
- [ ] Passar o mesmo `queryClient` ao `AuthProvider` quando necessário.
- [ ] Remover o `QueryClientProvider` duplicado/ineficiente de `App.tsx`.
- [ ] Revisar o uso de `useParams({ slug })` em `providers.tsx`: ele só deve existir se a rota realmente fornecer `slug`; caso contrário, remover o parâmetro.
- [ ] Adaptar a função `navigate` ao formato esperado pelo Better Auth UI, incluindo `to` e `replace` quando aplicável.
- [ ] Configurar o `Link` do Better Auth UI para usar o `Link` do TanStack Router.

Critério de conclusão: `Providers` pode ser renderizado dentro do layout raiz sem erros de contexto e os links de autenticação navegam pela SPA.

---

## Fase 4 — Criar rotas e telas de autenticação

Objetivo: tornar o Better Auth UI utilizável.

Criar rotas explícitas para:

- `/auth/sign-in`;
- `/auth/sign-up`;
- `/auth/forgot-password`;
- `/auth/reset-password`;
- `/auth/verify-email`;
- `/auth/callback` ou os callbacks exigidos pelos provedores OAuth;
- `/settings/account`.

Cada rota deve renderizar o componente correspondente, por exemplo:

```tsx
<Auth view="signIn" />
<Auth view="signUp" />
<Auth view="forgotPassword" />
<Auth view="resetPassword" />
<Auth view="verifyEmail" />
<Auth view="settings" />
```

- [ ] Usar `view` ou `path` de forma consistente, conforme a API do componente instalado.
- [ ] Definir `redirectTo` para uma rota existente após login.
- [ ] Tratar usuários autenticados que acessam `/auth/sign-in` e usuários não autenticados que acessam áreas protegidas.
- [ ] Usar redirecionamento de página completa apenas para callbacks externos/OAuth, não para navegação comum da SPA.
- [ ] Testar logout, sessão expirada e retorno à página anterior.

Critério de conclusão: todos os fluxos básicos de login, cadastro, recuperação e configurações funcionam sem links quebrados.

---

## Fase 5 — Alinhar autenticação backend/frontend

Objetivo: evitar uma UI que promete recursos inexistentes no servidor.

- [ ] Revisar `src/worker/auth.ts`.
- [ ] Confirmar plugins instalados no backend e no frontend.
- [ ] Gerar/aplicar migrations do Better Auth e do plugin Organization quando necessário.
- [ ] Verificar configuração de email, OAuth, secret, callbacks e `basePath`.
- [ ] Definir quais recursos serão MVP e quais ficarão desabilitados.
- [ ] Garantir que `/api/auth` seja usado somente como endpoint da API.

Critério de conclusão: cada recurso habilitado na UI tem implementação compatível no backend e foi testado com o ambiente local.

---

## Fase 6 — Implementar rotas protegidas e domínio

Objetivo: integrar autenticação ao sistema de doações sem expor dados entre organizações.

- [ ] Criar layout autenticado da aplicação.
- [ ] Criar rotas para assistidos, doadores, coletas, entregas e estoque, conforme [`adaptacoes-nova-stack.md`](./fluxo-telas/adaptacoes-nova-stack.md).
- [ ] Criar guard/`beforeLoad` que verifica sessão antes de renderizar rotas protegidas.
- [ ] Obter organização ativa da sessão, nunca de parâmetro enviado pelo cliente.
- [ ] Aplicar autorização no backend para `401`, `403` e acesso cruzado.
- [ ] Usar TanStack Table para busca, ordenação, paginação e seleção.
- [ ] Manter estados de carregamento, vazio, erro e sucesso acessíveis.

Critério de conclusão: uma rota protegida redireciona usuário anônimo para login e uma organização não acessa dados de outra.

---

## 4. Convenção de rotas

Adotar e documentar uma única convenção antes de criar redirects:

| Tipo | Convenção sugerida |
|---|---|
| Endpoint Better Auth | `/api/auth/*` |
| Login | `/auth/sign-in` |
| Cadastro | `/auth/sign-up` |
| Recuperação | `/auth/forgot-password` e `/auth/reset-password` |
| Callback OAuth | `/auth/callback/*` |
| Configurações | `/settings/*` |
| Aplicação autenticada | `/app/*` ou `/dashboard` |
| Domínio | `/assistidos`, `/doadores`, `/coletas`, `/entregas`, `/estoque` |

Não usar `/login` em alguns lugares e `/auth/sign-in` em outros sem um alias explícito e documentado.

---

## 5. Validação obrigatória

Após cada fase, executar o menor comando que cubra a alteração:

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
npm run check
npm run dev
```

Além dos comandos:

- [ ] Abrir a aplicação no navegador.
- [ ] Verificar navegação entre rotas públicas.
- [ ] Verificar login/logout e redirecionamento.
- [ ] Verificar callbacks OAuth, se habilitados.
- [ ] Verificar rotas protegidas com usuário anônimo e autenticado.
- [ ] Verificar isolamento por organização no backend.
- [ ] Verificar teclado, foco, labels e mensagens de erro.
- [ ] Confirmar que não há recarregamento desnecessário da SPA.

---

## 6. Critérios de aceite do plano

A integração será considerada concluída quando:

- [ ] O frontend não renderizar mais a tela de exemplo do Vite.
- [ ] TanStack Router estiver montado em `main.tsx`.
- [ ] Todos os providers estiverem dentro do contexto correto.
- [ ] Houver um único `QueryClient` estável.
- [ ] `authClient` existir e apontar para `/api/auth`.
- [ ] As rotas básicas de autenticação existirem e funcionarem.
- [ ] Os imports `@/*` estiverem resolvidos.
- [ ] O backend e o frontend tiverem plugins compatíveis.
- [ ] Rotas protegidas aplicarem autenticação e autorização.
- [ ] `npm run check` passar.
- [ ] O fluxo principal tiver sido testado no navegador.

---

## 7. Entregáveis sugeridos por pull request

Para facilitar revisão, dividir em PRs pequenos:

1. **Base TypeScript e aliases**
2. **Cliente Better Auth e providers**
3. **TanStack Router e layout raiz**
4. **Rotas de autenticação**
5. **Alinhamento backend/plugins**
6. **Rotas protegidas e telas de domínio**

Não misturar a criação de todas as telas de domínio com a correção da base de autenticação; isso dificulta identificar a origem dos erros.
