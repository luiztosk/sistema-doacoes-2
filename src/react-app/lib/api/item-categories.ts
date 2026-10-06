import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { infer as ZodInfer } from "zod";

import type {
	itemCategoryInsertSchema,
	itemCategorySelectSchema,
} from "@/schemas/zod/inventory";

export type ItemCategory = Pick<
	ItemCategoryCompleto,
	"id" | "name"
>;

export type ItemCategoryCompleto = ZodInfer<typeof itemCategorySelectSchema>;

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type ItemCategoryFormValues = RequiredNullable<
	ZodInfer<typeof itemCategoryInsertSchema>
>;

export const itemCategoryKeys = {
	all: ["item-categories"] as const,
	detail: (id: string) => [...itemCategoryKeys.all, id] as const,
};

const endpoint = "/api/v1/item-categories";

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

export const itemCategoryOptions = queryOptions({
	queryKey: itemCategoryKeys.all,
	queryFn: async (): Promise<ItemCategory[]> => {
		const { data } = await request<ItemCategory[]>(endpoint, {
			method: "GET",
		});
		return data;
	},
	staleTime: 1000 * 30,
});

export const itemCategoryDetailOptions = (id: string) =>
	queryOptions({
		queryKey: itemCategoryKeys.detail(id),
		queryFn: async (): Promise<ItemCategoryCompleto> => {
			const { data } = await request<ItemCategoryCompleto>(
				`${endpoint}/${id}`,
				{ method: "GET" },
			);
			return data;
		},
	});

export const createItemCategoryOptions = mutationOptions({
	mutationKey: [...itemCategoryKeys.all, "create"],
	mutationFn: async (
		payload: ItemCategoryFormValues,
	): Promise<ItemCategoryCompleto> => {
		const { data } = await request<ItemCategoryCompleto>(endpoint, {
			method: "POST",
			body: JSON.stringify(payload),
		});
		return data;
	},
});

export const updateItemCategoryOptions = (id: string) =>
	mutationOptions({
		mutationKey: [...itemCategoryKeys.all, "update"],
		mutationFn: async (
			payload: ItemCategoryFormValues,
		): Promise<ItemCategoryCompleto> => {
			const { data } = await request<ItemCategoryCompleto>(
				`${endpoint}/${id}`,
				{
					method: "PATCH",
					body: JSON.stringify(payload),
				},
			);
			return data;
		},
	});
