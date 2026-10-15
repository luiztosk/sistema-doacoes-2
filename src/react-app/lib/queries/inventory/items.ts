import { mutationOptions } from "@tanstack/react-query";
import type {
  ItemSelect,
  ItemInsert,
  ItemUpdate,
} from "@/schemas/zod/inventory";

const endpoint = "/api/v1/inventory/items";

export const createItemMutationOptions = mutationOptions({
  mutationKey: ["inventory-items", "create"],
  mutationFn: async (payload: ItemInsert): Promise<ItemSelect> => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Request failed with ${res.status}`);
    }

    return res.json();
  },
});

export const updateItemMutationOptions = (id: string) =>
  mutationOptions({
    mutationKey: ["inventory-items", "update", id],
    mutationFn: async (payload: ItemUpdate): Promise<ItemSelect> => {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Request failed with ${res.status}`);
      }

      return res.json();
    },
  });

export const deleteItemMutationOptions = (id: string) =>
  mutationOptions({
    mutationKey: ["inventory-items", "delete", id],
    mutationFn: async (): Promise<void> => {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Request failed with ${res.status}`);
      }
    },
  });

// Alternative exports for backward compatibility with existing code
export const createItemMutation = () => createItemMutationOptions;
export const updateItemMutation = (id: string) => updateItemMutationOptions(id);
export const deleteItemMutation = (id: string) => deleteItemMutationOptions(id);