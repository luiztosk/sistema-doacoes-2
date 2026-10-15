import { $api } from "../fetch-client";
import type { infer as ZodInfer } from "zod";

import type {
	deliveryInsertSchema,
	deliverySelectSchema,
} from "@/schemas/zod/inventory";

export type DeliveryLineItem = {
	inventoryItemId: string;
	quantity: number;
};

export type Delivery = Pick<
	DeliveryCompleto,
	"id" | "beneficiaryId" | "occurredAt" | "status" | "note"
> & {
	lines?: DeliveryLineItem[];
} & {
	occurredAt: string | null;
};

export type DeliveryCompleto = ZodInfer<typeof deliverySelectSchema> & {
	lines?: DeliveryLineItem[];
} & {
	occurredAt: string | Date | null;
};

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type DeliveryFormValues = RequiredNullable<
	ZodInfer<typeof deliveryInsertSchema>
> & {
	lines?: { inventoryItemId: string; quantity: number }[];
};

export const deliveryKeys = {
	all: ["deliveries"] as const,
	detail: (id: string) => [...deliveryKeys.all, id] as const,
};

export const deliveryOptions = $api.queryOptions(
	"get", "/api/v1/deliveries"
);

export function deliveryDetailOptions(id: string) {
	return $api.queryOptions("get", "/api/v1/deliveries/{id}", {
		params: { path: { id } },
	});
}

export const createDeliveryMutation = () =>
	$api.useMutation("post", "/api/v1/deliveries");

export const updateDeliveryMutation = () =>
	$api.useMutation("patch", "/api/v1/deliveries/{id}");