import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { idSchema } from "./common";
import { unitSchema } from "./enums";

const itemFields = {
	name: z
		.string()
		.trim()
		.min(1, { error: "O nome do item não pode ficar em branco." }),
	categoryId: idSchema,
	unit: unitSchema,
};

const itemQuantities = {
	onHand: z.number().int().nonnegative(),
	reserved: z.number().int().nonnegative(),
	available: z.number().int().nonnegative(),
};

export const itemSchema = z
	.object({
	id: idSchema,
	...itemFields,
	...itemQuantities,
	})
	.strict();

export const itemListSchema = itemSchema;

export const itemCreateSchema = z.object(itemFields).strict();

export const itemUpdateSchema = z.object(itemFields).partial().strict();

export type Item = ZodInfer<typeof itemSchema>;
export type ItemList = ZodInfer<typeof itemListSchema>;
export type ItemCreate = ZodInfer<typeof itemCreateSchema>;
export type ItemUpdate = ZodInfer<typeof itemUpdateSchema>;
