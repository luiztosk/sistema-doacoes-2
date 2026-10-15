// import { mutationOptions } from "@tanstack/react-query";
import { $api } from "../fetch-client";

// const endpoint = "/api/v1/inventory/items";

export const createItemMutation = () =>
  $api.useMutation("post", "/api/v1/inventory/items");

export const updateItemMutation = () =>
  $api.useMutation("patch", "/api/v1/inventory/items/{id}")

// export const deleteItemMutationOptions = (id: string) =>
//   mutationOptions({
//     mutationKey: ["inventory-items", "delete", id],
//     mutationFn: async (): Promise<void> => {
//       const res = await fetch(`${endpoint}/${id}`, {
//         method: "DELETE",
//       });

//       if (!res.ok) {
//         throw new Error(`Request failed with ${res.status}`);
//       }
//     },
//   });

export const itemsOptions = $api.queryOptions(
	"get", "/api/v1/inventory/items"
);

export function itemOptions(id: string) {
	return ($api.queryOptions("get", "/api/v1/inventory/items/{id}", {
		params: {
			path: { id: id }
		},
  }))
}

