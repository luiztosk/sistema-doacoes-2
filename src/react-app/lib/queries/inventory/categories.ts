import { $api } from "../fetch-client";

export const itemCategoriesQuery = () =>
	$api.useQuery("get", "/api/v1/inventory/categories");