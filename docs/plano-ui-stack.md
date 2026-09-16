# Plano — Stack UI: better-auth-ui + shadcn/ui + TanStack Query + TanStack Table

Estado: rascunho revisado. Baseado nas documentações consultadas:
- `better-auth-ui.com` (documentação oficial da biblioteca comunitária `better-auth-ui`)
- `tanstack.com/query`, `tanstack.com/table` e `tanstack.com/router`

> **Nota importante:** `better-auth-ui` é um **projeto comunitário**, não faz parte do pacote oficial `better-auth`. Suporte e manutenção seguem o ritmo da comunidade. A documentação em `better-auth-ui.com` é a referência oficial da própria biblioteca, mas não deve ser confundida com a documentação do time do Better Auth.

---

## Contexto do repositório

| Camada | Atual | Observação |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | SPA simples; `App.tsx` básico sem router |
| Backend/API | Hono + Cloudflare Workers | Integrado ao deploy automático |
| Banco | D1 (SQLite) + Drizzle ORM | Schema já traduzido do legado |
| Auth | `better-auth` v1.7.4 + `drizzle-adapter` + `organization()` plugin | `src/worker/auth.ts` configurado |
| UI | Nenhuma biblioteca de componentes | Não há `shadcn/ui`, `radix`, etc. no `package.json` |

---

## Escolha proposta

Usar **better-auth-ui** (biblioteca comunitária — `better-auth-ui.com`) com **shadcn/ui**, **TanStack Query** e **TanStack Table**, adotando **TanStack Router** como roteador da SPA.

---

## Por que faz sentido (com base nas documentações consultadas)

### 1. `better-auth-ui` (biblioteca comunitária — `better-auth-ui.com/docs/shadcn`)

- Componentes prontos de autenticação (`Auth`, `SignIn`, `SignUp`, `ForgotPassword`, `ResetPassword`, `Settings`, `UserButton`, `UserAvatar`) estilizados com **shadcn/ui**.
- Instalação via `shadcn CLI`: `npx shadcn@latest add @better-auth-ui/auth` (após configurar o registry — ver checklist).
- Pacote atual: **`@better-auth-ui/react`** (e `@better-auth-ui/core`). O antigo `@daveyplate/better-auth-ui` está em modo legado (somente correções), não deve ser usado em projetos novos.
- Plugins já alinhados com o repo: `Organization`, `Admin`, `Two Factor`, etc. — nosso `auth.ts` já usa `organization()`.
- Não exige mudança no backend (`auth.ts`, schema Drizzle, D1).

### 2. `shadcn/ui`

- Não está no `package.json` atual; será necessário adicionar o CLI e os componentes base (`button`, `card`, `input`, `label`, `sonner`, etc.).
- É o design system recomendado pela documentação do `better-auth-ui` (`docs/shadcn`).
- Componentes são copiados para o projeto (não pacotes externos), o que facilita customização e atende ao requisito de acessibilidade do PI.
- **Atenção:** os exemplos oficiais de Data Table do `shadcn/ui` têm lacunas de acessibilidade conhecidas (ex.: inputs de filtro sem `aria-label`). Devem ser corrigidos manualmente para atender à WCAG.

### 3. TanStack Query (`tanstack.com/query`)

- A camada de dados oficial do `better-auth-ui` é `@better-auth-ui/react`, construída diretamente sobre TanStack Query (`useQuery`, `useMutation`, `QueryClientProvider`).
- Cache keys oficiais: prefixo `"auth"` (`["auth", "user", userId, ...]`).
- Permite invalidação automática após sign-out ou troca de conta, o que é crítico para um sistema multi-tenant (organizações).

### 4. TanStack Table (`tanstack.com/table`)

- Headless: não impõe markup ou estilos. Funciona com qualquer biblioteca de UI, incluindo **shadcn/ui** (exemplos oficiais no site: "Kitchen Sink shadcn/ui + Base UI").
- Ideal para as views do sistema (assistidos, doadores, coletas, entregas, itens, estoque), que precisam de ordenação, paginação, filtros e seleção de linhas.
- Como é headless, os componentes visuais podem ser construídos com HTML semântico (`table`, `th`, `label`) e foco visível, atendendo ao requisito de **acessibilidade** do PI II.

### 5. TanStack Router (`tanstack.com/router`)

- **Escolha recomendada como roteador da SPA**, em vez de `react-router-dom`.
- Integração documentada com `better-auth-ui` (guia em `better-auth-ui.com/docs/shadcn/integrations/tanstack-start`).
- Type safety end-to-end: params, search params e loaders inferidos pelo route tree gerado.
- Cache de search params via Zod permite tipar filtros e paginação das tabelas sem parsing manual.
- Deploy em Cloudflare Workers tem guia oficial (usa `unenv` para normalizar APIs Node.js).
- **Importante:** o guia do `better-auth-ui` referencia **TanStack Start**, que é um meta-framework full-stack (SSR + server functions). **Não adotaremos TanStack Start** neste projeto — usaremos apenas o **TanStack Router** como biblioteca de roteamento SPA, pois já temos o backend Hono em Cloudflare Workers. As partes SSR-específicas do guia (`beforeLoad` com `createIsomorphicFn`, `ensureSessionServer`) devem ser ignoradas.

---

## Integração com o repo atual (React + Vite)

A documentação oficial (`better-auth-ui.com`) prioriza **TanStack Start** e **Next.js**. Para React puro (Vite), usa-se diretamente a **React Reference** (`better-auth-ui.com/docs/react`):

- Importar `@better-auth-ui/react` para hooks (`useSession`, `useAuthQuery`, `useAuthMutation`).
- Envolver a aplicação com `QueryClientProvider` (TanStack Query).
- **É obrigatório** fornecer um roteador — recomendamos **TanStack Router** — e passar as funções de navegação (`navigate`, `Link`) para o `AuthUIProvider`, pois os componentes de autenticação redirecionam o usuário (sign-in, sign-out, reset de senha, etc.).

---

## Ajustes necessários (checklist)

1. [ ] Configurar o registry do shadcn: `npx shadcn@latest registry add @better-auth-ui` (se ainda não estiver configurado).
2. [ ] Instalar `shadcn/ui` (CLI + componentes base: `button`, `card`, `input`, `label`, `sonner`, `table`, etc.).
3. [ ] Instalar `@tanstack/react-query` e `@tanstack/react-table`.
4. [ ] Instalar e configurar **TanStack Router** (`@tanstack/react-router` + plugin Vite `@tanstack/router-plugin`).
5. [ ] Instalar `@better-auth-ui/react` (e `@better-auth-ui/core`, se necessário) e os componentes via `npx shadcn add @better-auth-ui/auth` (opcionais: `settings`, `user-button`).
6. [ ] Configurar `QueryClientProvider` e `RouterProvider` no root (`src/react-app/main.tsx` ou `App.tsx`).
7. [ ] Configurar o `AuthUIProvider` com as funções de navegação do TanStack Router (`navigate` e `Link`).
8. [ ] Criar as rotas de auth (`/auth/sign-in`, `/auth/sign-up`, etc.) usando os componentes do `better-auth-ui`.
9. [ ] Nenhuma alteração em `src/worker/auth.ts` ou `drizzle.config.ts` é necessária.

---

## Riscos e observações

| Risco | Mitigação |
|---|---|
| `better-auth-ui` é mantido pela **comunidade**, não pelo time do Better Auth | Acompanhar o repositório oficial; considerar construir UI própria com hooks do Better Auth caso o projeto fique sem manutenção. |
| `better-auth-ui` é primariamente para TanStack Start / Next.js; React puro (Vite) usa a "React Reference" | Confirmado na doc oficial (`docs/react`). Funciona, mas requer configuração manual do `QueryClientProvider` **e de um roteador** (TanStack Router recomendado). |
| Guia de integração do `better-auth-ui` referencia **TanStack Start** (meta-framework), não apenas o Router | Usar o guia como **referência** para `AuthProvider` + navegação; ignorar as partes SSR-específicas. Não migrar para TanStack Start — o backend Hono já cobre as necessidades. |
| TanStack Router tem comunidade menor que React Router (~1.2M vs ~53.8M downloads semanais) | Aceitável dado o ganho de type safety e a integração documentada com `better-auth-ui`. Alternativa conservadora: `react-router-dom` (funciona, mas menos documentado com `better-auth-ui`). |
| Incidente de supply-chain em maio/2026 afetou 42 pacotes TanStack | Já resolvido pelo time TanStack (all-clear após auditoria). Fixar versões e usar lockfile. |
| `TanStack Table` é headless — não fornece UI pronta | Construir os componentes de tabela com `shadcn/ui` (ex: `table`, `button`, `input` para filtros). Vantagem para acessibilidade (controle total do markup). |
| `shadcn/ui` não está no `package.json` | Adicionar via CLI; os componentes são copiados para `src/components/ui/`, não como dependência de runtime. |
| Exemplos oficiais de Data Table do `shadcn/ui` têm lacunas de acessibilidade | Revisar e adicionar `aria-label`, labels associados e navegação por teclado ao adaptar os exemplos. |
| Acessibilidade é requisito do PI II | shadcn/ui (baseado em `radix-ui` com ARIA nativo) + TanStack Table (markup customizável) permite atender: labels associados, navegação por teclado, contraste, `aria-live` para mensagens. |

---

## Conclusão

A combinação proposta (`better-auth-ui` + `shadcn/ui` + TanStack Query + TanStack Table + TanStack Router) é **compatível** com o repositório atual, **alinhada** com as documentações consultadas, e **viável** para o escopo do PI II. Nenhuma mudança no backend é exigida, e a camada de UI pode ser construída progressivamente (auth primeiro, depois tabelas de dados).

Pontos de atenção que devem acompanhar a implementação:
- `better-auth-ui` é comunitário, não oficial do Better Auth.
- Usar `@better-auth-ui/react`, não `@daveyplate/better-auth-ui`.
- **TanStack Router** como roteador, não TanStack Start.
- Corrigir manualmente as lacunas de acessibilidade dos exemplos do `shadcn/ui`.