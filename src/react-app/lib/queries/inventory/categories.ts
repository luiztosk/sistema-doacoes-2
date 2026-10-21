import { $api, semEnvelope } from "../fetch-client";
import type { infer as ZodInfer } from "zod";

import { categoryCreateSchema } from "@/schemas/api/category";

export const categoryKeys = {
	all: ["inventory", "categories"] as const,
	detail: (id: string) => [...categoryKeys.all, id] as const,
};

export const categoriesOptions = $api.queryOptions(
	"get",
	"/api/v1/inventory/categories",
	{},
	{ select: (response) => semEnvelope(response) },
);

export const categoryOptions = (id: string) =>
	$api.queryOptions(
		"get",
		"/api/v1/inventory/categories/{id}",
		{ params: { path: { id } } },
		{ select: (response) => semEnvelope(response) },
	);

export const createCategoryMutation = () =>
	$api.useMutation("post", "/api/v1/inventory/categories");

export const updateCategoryMutation = () =>
	$api.useMutation("patch", "/api/v1/inventory/categories/{id}");

export const deleteCategoryMutation = () =>
	$api.useMutation("delete", "/api/v1/inventory/categories/{id}");

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type CategoryFormValues = RequiredNullable<
	ZodInfer<typeof categoryCreateSchema>
>;
