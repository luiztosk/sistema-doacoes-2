import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { idSchema } from "./common";
import { unitSchema } from "./enums";

export const stockSchema = z
	.object({
	itemId: idSchema,
	name: z.string(),
	categoryId: idSchema,
	categoryName: z.string(),
	unit: unitSchema,
	onHand: z.number().int().nonnegative(),
	reserved: z.number().int().nonnegative(),
	available: z.number().int().nonnegative(),
	})
	.strict();

export const stockListSchema = z.array(stockSchema);

export type Stock = ZodInfer<typeof stockSchema>;
export type StockList = ZodInfer<typeof stockListSchema>;
