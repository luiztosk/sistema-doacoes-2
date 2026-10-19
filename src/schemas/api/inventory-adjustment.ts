import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { idSchema, occurredAtSchema } from "./common";
import { adjustmentReasonSchema } from "./enums";

export const inventoryAdjustmentSchema = z
	.object({
	id: idSchema,
	itemId: idSchema,
	itemName: z.string(),
	delta: z.number().int(),
	reason: adjustmentReasonSchema,
	occurredAt: occurredAtSchema,
	})
	.strict();

export const inventoryAdjustmentListSchema = z.array(inventoryAdjustmentSchema);

export const inventoryAdjustmentCreateSchema = z
	.object({
		itemId: idSchema,
		delta: z.number().int(),
		reason: adjustmentReasonSchema,
		occurredAt: occurredAtSchema,
	})
	.strict();

export type InventoryAdjustment = ZodInfer<typeof inventoryAdjustmentSchema>;
export type InventoryAdjustmentList = ZodInfer<
	typeof inventoryAdjustmentListSchema
>;
export type InventoryAdjustmentCreate = ZodInfer<
	typeof inventoryAdjustmentCreateSchema
>;
