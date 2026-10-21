import { $api, semEnvelope } from "../fetch-client";
import type { infer as ZodInfer } from "zod";

import { donorCreateSchema } from "@/schemas/api/donor";

export const donorKeys = {
	all: ["donors"] as const,
	detail: (id: string) => [...donorKeys.all, id] as const,
};

export const donorsOptions = $api.queryOptions(
	"get",
	"/api/v1/donors",
	{},
	{ select: (response) => semEnvelope(response) },
);

export const donorOptions = (id: string) =>
	$api.queryOptions(
		"get",
		"/api/v1/donors/{id}",
		{ params: { path: { id } } },
		{ select: (response) => semEnvelope(response) },
	);

export const createDonorMutation = () =>
	$api.useMutation("post", "/api/v1/donors");

export const updateDonorMutation = () =>
	$api.useMutation("patch", "/api/v1/donors/{id}");

export const deleteDonorMutation = () =>
	$api.useMutation("delete", "/api/v1/donors/{id}");

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type DonorFormValues = RequiredNullable<
	ZodInfer<typeof donorCreateSchema>
>;
