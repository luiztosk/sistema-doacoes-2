import { $api, semEnvelope } from "../fetch-client";
import type { infer as ZodInfer } from "zod";

import { itemCreateSchema } from "@/schemas/api/item";

export const itemKeys = {
	all: ["inventory", "items"] as const,
	detail: (id: string) => [...itemKeys.all, id] as const,
};

export const itemsOptions = $api.queryOptions(
	"get",
	"/api/v1/inventory/items",
	{},
	{ select: (response) => semEnvelope(response) },
);

export const itemOptions = (id: string) =>
	$api.queryOptions(
		"get",
		"/api/v1/inventory/items/{id}",
		{ params: { path: { id } } },
		{ select: (response) => semEnvelope(response) },
	);

export const createItemMutation = () =>
	$api.useMutation("post", "/api/v1/inventory/items");

export const updateItemMutation = () =>
	$api.useMutation("patch", "/api/v1/inventory/items/{id}");

export const deleteItemMutation = () =>
	$api.useMutation("delete", "/api/v1/inventory/items/{id}");

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type ItemFormValues = RequiredNullable<ZodInfer<typeof itemCreateSchema>>;
