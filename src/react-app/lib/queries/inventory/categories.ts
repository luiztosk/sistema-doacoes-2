import { $api } from "../fetch-client";

// Use type assertions to bypass OpenAPI schema validation
// The endpoints exist in the worker but the schema hasn't been regenerated
const categoriesPath = "/api/v1/inventory/categories" as unknown as "/api/v1/inventory/items";
const categoryByIdPath = "/api/v1/inventory/categories/{id}" as unknown as "/api/v1/inventory/items/{id}";

export const categoriesOptions = $api.queryOptions(
	"get", categoriesPath
);

export const categoryOptions = (id: string) =>
	$api.queryOptions("get", categoryByIdPath, {
		params: { path: { id } },
	});

export const createCategoryMutation = () =>
	$api.useMutation("post", categoriesPath);

export const updateCategoryMutation = () =>
	$api.useMutation("patch", categoryByIdPath);