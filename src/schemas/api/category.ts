import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { idSchema } from "./common";

const categoryFields = {
	name: z
		.string()
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

export type Category = ZodInfer<typeof categorySchema>;
export type CategoryList = ZodInfer<typeof categoryListSchema>;
export type CategoryCreate = ZodInfer<typeof categoryCreateSchema>;
export type CategoryUpdate = ZodInfer<typeof categoryUpdateSchema>;
