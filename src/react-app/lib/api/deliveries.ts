import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { infer as ZodInfer } from "zod";

import type {
	deliveryInsertSchema,
	deliverySelectSchema,
} from "@/worker/db/schema";

export type DeliveryLineItem = {
	inventoryItemId: string;
	quantity: number;
};

export type Delivery = Pick<
	DeliveryCompleto,
	"id" | "beneficiaryId" | "occurredAt" | "status" | "note"
> & {
	lines?: DeliveryLineItem[];
};

export type DeliveryCompleto = ZodInfer<typeof deliverySelectSchema> & {
	lines?: DeliveryLineItem[];
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

const endpoint = "/api/v1/deliveries";

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

export const deliveryOptions = queryOptions({
	queryKey: deliveryKeys.all,
	queryFn: async (): Promise<Delivery[]> => {
		const { data } = await request<Delivery[]>(endpoint, { method: "GET" });
		return data;
	},
	staleTime: 1000 * 30,
});

export const deliveryDetailOptions = (id: string) =>
	queryOptions({
		queryKey: deliveryKeys.detail(id),
		queryFn: async (): Promise<DeliveryCompleto> => {
			const { data } = await request<DeliveryCompleto>(
				`${endpoint}/${id}`,
				{ method: "GET" },
			);
			return data;
		},
	});

export const createDeliveryOptions = mutationOptions({
	mutationKey: [...deliveryKeys.all, "create"],
	mutationFn: async (
		payload: DeliveryFormValues,
	): Promise<DeliveryCompleto> => {
		const { data } = await request<DeliveryCompleto>(endpoint, {
			method: "POST",
			body: JSON.stringify(payload),
		});
		return data;
	},
});

export const updateDeliveryOptions = (id: string) =>
	mutationOptions({
		mutationKey: [...deliveryKeys.all, "update"],
		mutationFn: async (
			payload: DeliveryFormValues,
		): Promise<DeliveryCompleto> => {
			const { data } = await request<DeliveryCompleto>(
				`${endpoint}/${id}`,
				{
					method: "PATCH",
					body: JSON.stringify(payload),
				},
			);
			return data;
		},
	});
