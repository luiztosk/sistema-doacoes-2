import { $api } from "./fetch-client"

export function itemOptions (id: string) {
	return($api.queryOptions( "get", "/api/v1/inventory/items/{id}", {
		params: {
			path: { id: id }
		},
	})
)
}
export const itemsOptions = $api.queryOptions(
	"get", "/api/v1/inventory/items"
)
export const categoriesOptions = $api.queryOptions(
	"get", "/api/v1/inventory/categories"
)