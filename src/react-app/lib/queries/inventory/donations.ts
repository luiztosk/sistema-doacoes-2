import { $api } from "../fetch-client";
import type { infer as ZodInfer } from "zod";

import type {
	donationInsertSchema,
	donationSelectSchema,
} from "@/schemas/zod/inventory";

export type DonationLineItem = {
	inventoryItemId: string;
	quantity: number;
};

export type Donation = Pick<
	DonationCompleto,
	"id" | "donorId" | "occurredAt" | "status" | "note"
> & {
	lines?: DonationLineItem[];
} & {
	occurredAt: string | null;
};

export type DonationCompleto = ZodInfer<typeof donationSelectSchema> & {
	lines?: DonationLineItem[];
} & {
	occurredAt: string | Date | null;
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

export const donationOptions = $api.queryOptions(
	"get", "/api/v1/donations"
);

export function donationDetailOptions(id: string) {
	return $api.queryOptions("get", "/api/v1/donations/{id}", {
		params: { path: { id } },
	});
}

export const createDonationMutation = () =>
	$api.useMutation("post", "/api/v1/donations");

export const updateDonationMutation = () =>
	$api.useMutation("patch", "/api/v1/donations/{id}");