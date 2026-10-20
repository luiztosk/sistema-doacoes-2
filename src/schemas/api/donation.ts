import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { idSchema, occurredAtSchema } from "./common";
import { donationStatusSchema } from "./enums";

export const donationItemSchema = z.object({
	itemId: idSchema,
	quantity: z
		.number()
		.int()
		.positive({ error: "A quantidade precisa ser maior que zero." }),
});

const donationFields = {
	donorId: idSchema,
	occurredAt: occurredAtSchema,
	status: donationStatusSchema,
	note: z.string().trim().nullish(),
};

export const donationSchema = z
	.object({
	id: idSchema,
	...donationFields,
	items: z.array(donationItemSchema),
	})
	.strict();

export const donationListSchema = z
	.object({
	id: idSchema,
	...donationFields,
	})
	.strict();

export const donationCreateSchema = z
	.object({
		donorId: donationFields.donorId,
		occurredAt: donationFields.occurredAt,
		note: donationFields.note,
		items: z
			.array(donationItemSchema)
			.min(1, { error: "A doação precisa de pelo menos um item." }),
	})
	.strict();

export const donationUpdateSchema = z
	.object({
		donorId: donationFields.donorId.optional(),
		occurredAt: donationFields.occurredAt.optional(),
		note: donationFields.note.optional(),
	})
	.strict();

export type Donation = ZodInfer<typeof donationSchema>;
export type DonationList = ZodInfer<typeof donationListSchema>;
export type DonationCreate = ZodInfer<typeof donationCreateSchema>;
export type DonationUpdate = ZodInfer<typeof donationUpdateSchema>;
export type DonationItem = ZodInfer<typeof donationItemSchema>;
