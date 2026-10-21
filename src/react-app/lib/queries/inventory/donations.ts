import { $api, semEnvelope } from "../fetch-client";
import type { infer as ZodInfer } from "zod";

import { donationCreateSchema, donationUpdateSchema } from "@/schemas/api/donation";

export const donationKeys = {
	all: ["donations"] as const,
	detail: (id: string) => [...donationKeys.all, id] as const,
};

export const donationsOptions = $api.queryOptions(
	"get",
	"/api/v1/donations",
	{},
	{ select: (response) => semEnvelope(response) },
);

export const donationOptions = (id: string) =>
	$api.queryOptions(
		"get",
		"/api/v1/donations/{id}",
		{ params: { path: { id } } },
		{ select: (response) => semEnvelope(response) },
	);

export const createDonationMutation = () =>
	$api.useMutation("post", "/api/v1/donations");

export const updateDonationMutation = () =>
	$api.useMutation("patch", "/api/v1/donations/{id}");

export const voidDonationMutation = () =>
	$api.useMutation("post", "/api/v1/donations/{id}/void");

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type DonationItemRow = {
	itemId: string | null;
	quantity: number | null;
};

/**
 * O estado do formulário é o payload. A doação é a única que carrega os
 * itens, e eles **são** o conteúdo do documento — por isso o `PATCH` do
 * cabeçalho não os leva, e a lista de itens só é editável na criação.
 */
export type DonationFormValues = Omit<
	RequiredNullable<ZodInfer<typeof donationCreateSchema>>,
	"items"
> & {
	items: DonationItemRow[];
};

export type DonationHeaderValues = RequiredNullable<
	ZodInfer<typeof donationUpdateSchema>
>;
