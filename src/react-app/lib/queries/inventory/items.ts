import { UseQueryResult } from "@tanstack/react-query";
import { $api } from "../fetch-client";
import { InventoryItemSelect, InventoryItemTableView } from "@/schemas/zod/inventory";

export const inventoryItemsQuery = (): UseQueryResult<InventoryItemTableView[]> =>
	$api.useQuery("get", "/api/v1/inventory/items");

export const inventoryItemQuery = (id: string) =>
	$api.useQuery("get", "/api/v1/inventory/items/{id}", {
		params: { path: { id } },
	});

export const createInventoryItemMutation = () =>
	$api.useMutation("post", "/api/v1/inventory/items");

export const updateInventoryItemMutation = () =>
	$api.useMutation("patch", "/api/v1/inventory/items/{id}");

export const deleteInventoryItemMutation = () =>
	$api.useMutation("delete", "/api/v1/inventory/items/{id}");