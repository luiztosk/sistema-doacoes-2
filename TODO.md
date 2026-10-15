# TODO - Sistema Doações 2

## Problemas atuais (build falha)

### 1. TypeScript errors em `src/worker/routes/inventory/`
- **donation.ts**: usa `itemId` em vez de `inventoryItemId`, importa `item` que não existe
- **delivery.ts**: usa `itemId` em vez de `inventoryItemId`, importa `item` que não existe
- **inventory-count.ts**: usa `itemId` em vez de `inventoryItemId`, importa `item` que não existe
- **inventory-adjustment.ts**: importa `item` que não existe

O schema do banco usa `inventoryItemId` (coluna `inventory_item_id`), não `itemId`.

### 2. TypeScript error em `src/react-app/components/forms/inventory/delivery.tsx`
- `DeliveryFormValues` tem `beneficiaryId: string | null` mas o schema espera `string`
- O `RequiredNullable` transforma campos em `null` mas o zod schema tem campos `notNull`

### 3. TypeScript errors em `scripts/generate.ts` e `scripts/seed.ts`
- Importações de schemas que não existem (`inventoryItemSelectSchema`, `itemCategorySelectSchema`)
- Propriedades que não existem no `SeedData`

---

## Features faltando (donation e delivery forms)

### 4. Formulário de Doação (`components/forms/inventory/donation.tsx`)
**Estado atual**: só campos de cabeçalho (doador, data, observação)
**Falta**: tabela de linhas de doação com:
- Seleção de item do estoque (`inventory_item`)
- Quantidade (número inteiro positivo)
- Botão adicionar/remover linhas
- Validação: item não pode repetir na mesma doação
- Mínimo 1 linha para criar

### 5. Formulário de Entrega (`components/forms/inventory/delivery.tsx`)
**Estado atual**: só campos de cabeçalho (beneficiário, data, observação)
**Falta**: tabela de linhas de entrega com:
- Seleção de item do estoque
- Quantidade
- Botão adicionar/remover linhas
- Validação: item não pode repetir, mínimo 1 linha
- Verificação de estoque disponível (frontend pode avisar, mas API valida)

### 6. Tipos e queries (`lib/queries/inventory/donations.ts`, `deliveries.ts`)
- `DonationFormValues` e `DeliveryFormValues` já têm `lines?` mas os formulários não usam
- Precisam passar `lines` no `onSubmit` para a API

### 7. Rotas de criação (`routes/_authenticated/inventory/donations/new.tsx`, `delivery/new.tsx`)
- Já usam o formulário, só precisam que o formulário suporte linhas

---

## Testes

### 8. `tests/api.ts` - 28 casos
- Só testa assistidos, coletas, itens (modelo antigo)
- **Falta**: casos para donation, delivery, inventory-items, item-categories, inventory-counts, inventory-adjustments
- Precisa adicionar casos cobrindo validações, transições de status, estoque

### 9. `tests/inventory.ts` - testes de integração com D1 local
- Já testa donation, delivery, counts, adjustments
- Precisa rodar com `npm test` mas falha porque API não está registrada no teste

---

## Documentação

### 10. `docs/frontend-formulario.md`
- Seção "Sem exemplo ainda" menciona que `SelectField` alimentado por outra lista não tem exemplo
- Donation/delivery forms precisam de `SelectField` para itens do estoque
- Atualizar quando implementar

---

## Como testar localmente

```bash
npm run dev      # Vite dev server
npm run lint     # ESLint
npm run test     # tsx tests/api.ts (stub em memória)
# npm run test:inventory  # tsx tests/inventory.ts (precisa D1 local via wrangler)
npm run build    # lint + tsc + vite build
```

---

## Branches

- `main` - branch principal
- `mess/but-in-a-good-way` - branch atual (1 commit à frente do origin)
- `feat/redesenho-estoque` - branch com autorização para mudanças quebrantes no modelo de estoque