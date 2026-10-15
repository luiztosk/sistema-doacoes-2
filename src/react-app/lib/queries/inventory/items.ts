import { $api } from "../fetch-client";

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