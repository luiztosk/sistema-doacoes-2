import { $api } from "../fetch-client";

export const categoriesOptions = $api.queryOptions(
	"get", "/api/v1/inventory/categories"
);

export const categoryOptions = (id: string) =>
	$api.queryOptions("get", "/api/v1/inventory/categories/{id}", {
		params: { path: { id } },
	});

export const createCategoryMutation = () =>
	$api.useMutation("post", "/api/v1/inventory/categories");

export const updateCategoryMutation = () =>
	$api.useMutation("patch", "/api/v1/inventory/categories/{id}");
