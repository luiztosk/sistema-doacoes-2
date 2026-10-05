import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { infer as ZodInfer } from "zod";

import type {
	donationInsertSchema,
	donationSelectSchema,
} from "@/worker/db/schema";

export type DonationLineItem = {
	inventoryItemId: string;
	quantity: number;
};

export type Donation = Pick<
	DonationCompleto,
	"id" | "donorId" | "occurredAt" | "status" | "note"
> & {
	lines?: DonationLineItem[];
};

export type DonationCompleto = ZodInfer<typeof donationSelectSchema> & {
	lines?: DonationLineItem[];
};

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type DonationFormValues = RequiredNullable<
	ZodInfer<typeof donationInsertSchema>
> & {
	lines?: { inventoryItemId: string; quantity: number }[];
};

export const donationKeys = {
	all: ["donations"] as const,
	detail: (id: string) => [...donationKeys.all, id] as const,
};

const endpoint = "/api/v1/donations";

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

export const donationOptions = queryOptions({
	queryKey: donationKeys.all,
	queryFn: async (): Promise<Donation[]> => {
		const { data } = await request<Donation[]>(endpoint, { method: "GET" });
		return data;
	},
	staleTime: 1000 * 30,
});

export const donationDetailOptions = (id: string) =>
	queryOptions({
		queryKey: donationKeys.detail(id),
		queryFn: async (): Promise<DonationCompleto> => {
			const { data } = await request<DonationCompleto>(
				`${endpoint}/${id}`,
				{ method: "GET" },
			);
			return data;
		},
	});

export const createDonationOptions = mutationOptions({
	mutationKey: [...donationKeys.all, "create"],
	mutationFn: async (
		payload: DonationFormValues,
	): Promise<DonationCompleto> => {
		const { data } = await request<DonationCompleto>(endpoint, {
			method: "POST",
			body: JSON.stringify(payload),
		});
		return data;
	},
});

export const updateDonationOptions = (id: string) =>
	mutationOptions({
		mutationKey: [...donationKeys.all, "update"],
		mutationFn: async (
			payload: DonationFormValues,
		): Promise<DonationCompleto> => {
			const { data } = await request<DonationCompleto>(
				`${endpoint}/${id}`,
				{
					method: "PATCH",
					body: JSON.stringify(payload),
				},
			);
			return data;
		},
	});
