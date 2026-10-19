# Reference Pattern: Inventory Items Routes

## Current Implementation (Reference)

**File**: `src/react-app/routes/_authenticated/inventory/items/index.tsx`

```tsx
import { inventoryItemsQuery } from "@/react-app/queries/inventory/items";

function ItemsTable() {
  const { isPending, isError, data, error } = inventoryItemsQuery()
  // ... error/loading handling
  return <InventoryItemsTable data={data as InventoryItemTableView[]} />
}
```

## Pattern Rules

1. **Query lives in queries folder** - `src/react-app/queries/inventory/items.ts`
2. **Route calls query directly** - `inventoryItemsQuery()` (not `useQuery`)
3. **Data passed as prop to table** - `<InventoryItemsTable data={data} />`
4. **No `useQuery`/`useMutation` in routes** - hooks return ready-to-use query/mutation objects

## Migration Plan for Other Resources

Replace the old `view...Router` pattern in:
- `beneficiaries` → `src/react-app/queries/contacts/beneficiaries.ts`
- `donors` → `src/react-app/queries/contacts/donors.ts`
- `donations` → `src/react-app/queries/inventory/donations.ts`
- `deliveries` → `src/react-app/queries/inventory/deliveries.ts`
- `item-categories` → `src/react-app/queries/inventory/categories.ts`

Each should export:
- `xxxQuery()` - list query
- `xxxQuery(id)` - detail query  
- `createXxxMutation()` - create mutation
- `updateXxxMutation(id)` - update mutation
- `deleteXxxMutation(id)` - delete mutation

Route files call queries directly and pass data to table components.