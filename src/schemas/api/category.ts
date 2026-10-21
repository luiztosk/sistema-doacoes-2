import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { idSchema } from "./common";

const categoryFields = {
	name: z
		.string({ error: "O nome da categoria não pode ficar em branco." })
		.trim()
		.min(1, { error: "O nome da categoria não pode ficar em branco." }),
};

export const categorySchema = z
	.object({
	id: idSchema,
	...categoryFields,
	})
	.strict();

export const categoryListSchema = categorySchema;

export const categoryCreateSchema = z.object(categoryFields).strict();

export const categoryUpdateSchema = z.object(categoryFields).partial().strict();

export type ItemCategory = ZodInfer<typeof categorySchema>;
export type ItemCategoryList = ZodInfer<typeof categoryListSchema>;
export type ItemCategoryCreate = ZodInfer<typeof categoryCreateSchema>;
export type ItemCategoryUpdate = ZodInfer<typeof categoryUpdateSchema>;
