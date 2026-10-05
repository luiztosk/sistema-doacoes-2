import { mutationOptions, queryOptions } from "@tanstack/react-query";

import type {
	InventoryItemInsert,
	InventoryItemSelect,
	InventoryItemTableView,
} from "@/worker/db/schema";

export const inventoryItemKeys = {
	all: ["inventory-items"] as const,
	detail: (id: string) => [...inventoryItemKeys.all, id] as const,
};

const endpoint = "/api/v1/inventory-items";

type ApiError = { code: string; message: string };

async function request<T>(
	path: string,
	init: RequestInit,
): Promise<{ data: T }> {
	const res = await fetch(path, {
		credentials: "include",
		...init,
		headers: { "content-type": "application/json", ...init.headers },
	});

	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: ApiError;
		} | null;
		throw Object.assign(
			new Error(body?.error?.message ?? `Request failed with ${res.status}`),
			{ code: body?.error?.code ?? "UNKNOWN" },
		);
	}

	return (await res.json()) as { data: T };
}

export const inventoryItemOptions = queryOptions({
	queryKey: inventoryItemKeys.all,
	queryFn: async (): Promise<InventoryItemTableView[]> => {
		const { data } = await request<InventoryItemTableView[]>(endpoint, {
			method: "GET",
		});
		return data;
	},
	staleTime: 1000 * 30,
});

export const inventoryItemDetailOptions = (id: string) =>
	queryOptions({
		queryKey: inventoryItemKeys.detail(id),
		queryFn: async (): Promise<InventoryItemSelect> => {
			const { data } = await request<InventoryItemSelect>(
				`${endpoint}/${id}`,
				{ method: "GET" },
			);
			return data;
		},
	});

export const createInventoryItemOptions = mutationOptions({
	mutationKey: [...inventoryItemKeys.all, "create"],
	mutationFn: async (
		payload: InventoryItemInsert,
	): Promise<InventoryItemSelect> => {
		const { data } = await request<InventoryItemSelect>(endpoint, {
			method: "POST",
			body: JSON.stringify(payload),
		});
		return data;
	},
});

export const updateInventoryItemOptions = (id: string) =>
	mutationOptions({
		mutationKey: [...inventoryItemKeys.all, "update"],
		mutationFn: async (
			payload: InventoryItemInsert,
		): Promise<InventoryItemSelect> => {
			const { data } = await request<InventoryItemSelect>(
				`${endpoint}/${id}`,
				{
					method: "PATCH",
					body: JSON.stringify(payload),
				},
			);
			return data;
		},
	});
