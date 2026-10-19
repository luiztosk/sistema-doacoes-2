import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { idSchema, occurredAtSchema } from "./common";

export const inventoryCountItemSchema = z.object({
	itemId: idSchema,
	countedQuantity: z
		.number()
		.int()
		.nonnegative({ error: "A quantidade contada não pode ser negativa." }),
});

const inventoryCountFields = {
	occurredAt: occurredAtSchema,
	countedBy: z.string().trim().nullish(),
	note: z.string().trim().nullish(),
};

export const inventoryCountSchema = z
	.object({
	id: idSchema,
	...inventoryCountFields,
	items: z.array(inventoryCountItemSchema),
	})
	.strict();

export const inventoryCountListSchema = z.array(inventoryCountSchema);

export const inventoryCountCreateSchema = z
	.object({
		...inventoryCountFields,
		items: z
			.array(inventoryCountItemSchema)
			.min(1, { error: "A contagem precisa de pelo menos um item." }),
	})
	.strict();

export type InventoryCount = ZodInfer<typeof inventoryCountSchema>;
export type InventoryCountList = ZodInfer<typeof inventoryCountListSchema>;
export type InventoryCountCreate = ZodInfer<typeof inventoryCountCreateSchema>;
export type InventoryCountItem = ZodInfer<typeof inventoryCountItemSchema>;
