import { $api, semEnvelope } from "../fetch-client";
import type { infer as ZodInfer } from "zod";

import { beneficiaryCreateSchema } from "@/schemas/api/beneficiary";

export const beneficiaryKeys = {
	all: ["beneficiaries"] as const,
	detail: (id: string) => [...beneficiaryKeys.all, id] as const,
};

export const beneficiariesOptions = $api.queryOptions(
	"get",
	"/api/v1/beneficiaries",
	{},
	{ select: (response) => semEnvelope(response) },
);

export const beneficiaryOptions = (id: string) =>
	$api.queryOptions(
		"get",
		"/api/v1/beneficiaries/{id}",
		{ params: { path: { id } } },
		{ select: (response) => semEnvelope(response) },
	);

export const createBeneficiaryMutation = () =>
	$api.useMutation("post", "/api/v1/beneficiaries");

export const updateBeneficiaryMutation = () =>
	$api.useMutation("patch", "/api/v1/beneficiaries/{id}");

export const deleteBeneficiaryMutation = () =>
	$api.useMutation("delete", "/api/v1/beneficiaries/{id}");

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type BeneficiaryFormValues = RequiredNullable<
	ZodInfer<typeof beneficiaryCreateSchema>
>;
