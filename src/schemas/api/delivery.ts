import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { idSchema, occurredAtSchema } from "./common";
import { deliveryStatusSchema } from "./enums";

export const deliveryItemSchema = z.object({
	itemId: idSchema,
	quantity: z
		.number()
		.int()
		.positive({ error: "A quantidade precisa ser maior que zero." }),
});

const deliveryFields = {
	beneficiaryId: idSchema,
	occurredAt: occurredAtSchema,
	status: deliveryStatusSchema,
	note: z.string().trim().nullish(),
};

export const deliverySchema = z
	.object({
	id: idSchema,
	...deliveryFields,
	})
	.strict();

export const deliveryListSchema = deliverySchema;

export const deliveryDetailSchema = deliverySchema.extend({
	items: z.array(deliveryItemSchema),
});

export const deliveryCreateSchema = z
	.object({
		beneficiaryId: deliveryFields.beneficiaryId,
		occurredAt: deliveryFields.occurredAt,
		note: deliveryFields.note,
		items: z
			.array(deliveryItemSchema)
			.min(1, { error: "A entrega precisa de pelo menos um item." }),
	})
	.strict();

export const deliveryUpdateSchema = z
	.object({
		beneficiaryId: deliveryFields.beneficiaryId.optional(),
		occurredAt: deliveryFields.occurredAt.optional(),
		note: deliveryFields.note.optional(),
	})
	.strict();

export type Delivery = ZodInfer<typeof deliverySchema>;
export type DeliveryList = ZodInfer<typeof deliveryListSchema>;
export type DeliveryDetail = ZodInfer<typeof deliveryDetailSchema>;
export type DeliveryCreate = ZodInfer<typeof deliveryCreateSchema>;
export type DeliveryUpdate = ZodInfer<typeof deliveryUpdateSchema>;
export type DeliveryItem = ZodInfer<typeof deliveryItemSchema>;
