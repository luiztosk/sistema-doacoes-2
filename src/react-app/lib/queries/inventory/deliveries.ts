import { $api, semEnvelope } from "../fetch-client";
import type { infer as ZodInfer } from "zod";

import { deliveryCreateSchema, deliveryUpdateSchema } from "@/schemas/api/delivery";

export const deliveryKeys = {
	all: ["deliveries"] as const,
	detail: (id: string) => [...deliveryKeys.all, id] as const,
};

export const deliveriesOptions = $api.queryOptions(
	"get",
	"/api/v1/deliveries",
	{},
	{ select: (response) => semEnvelope(response) },
);

export const deliveryOptions = (id: string) =>
	$api.queryOptions(
		"get",
		"/api/v1/deliveries/{id}",
		{ params: { path: { id } } },
		{ select: (response) => semEnvelope(response) },
	);

export const createDeliveryMutation = () =>
	$api.useMutation("post", "/api/v1/deliveries");

export const updateDeliveryMutation = () =>
	$api.useMutation("patch", "/api/v1/deliveries/{id}");

export const completeDeliveryMutation = () =>
	$api.useMutation("post", "/api/v1/deliveries/{id}/complete");

export const cancelDeliveryMutation = () =>
	$api.useMutation("post", "/api/v1/deliveries/{id}/cancel");

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type DeliveryItemRow = {
	itemId: string | null;
	quantity: number | null;
};

/**
 * O estado do formulário é o payload. A entrega é a única que carrega os
 * itens, e eles **são** o conteúdo do documento — por isso o `PATCH` do
 * cabeçalho não os leva, e a lista de itens só é editável na criação.
 */
export type DeliveryFormValues = Omit<
	RequiredNullable<ZodInfer<typeof deliveryCreateSchema>>,
	"items"
> & {
	items: DeliveryItemRow[];
};

export type DeliveryHeaderValues = RequiredNullable<
	ZodInfer<typeof deliveryUpdateSchema>
>;
