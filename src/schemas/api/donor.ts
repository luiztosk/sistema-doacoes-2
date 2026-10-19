import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { addressFields, idSchema } from "./common";

const donorFields = {
	name: z
		.string()
		.trim()
		.min(1, { error: "O nome não pode ficar em branco." }),
	phone: z.e164({
		error: "O telefone precisa estar no formato internacional, com o país.",
	}),
	email: z
		.email({ error: "O e-mail precisa ter um formato válido." })
		.optional(),
	...addressFields,
};

export const donorSchema = z
	.object({
	id: idSchema,
	...donorFields,
	})
	.strict();

export const donorListSchema = z
	.object({
	id: idSchema,
	name: donorFields.name,
	phone: donorFields.phone,
	email: donorFields.email,
	cidade: donorFields.cidade,
	uf: donorFields.uf,
	})
	.strict();

export const donorCreateSchema = z.object(donorFields).strict();

export const donorUpdateSchema = z.object(donorFields).partial().strict();

export type Donor = ZodInfer<typeof donorSchema>;
export type DonorList = ZodInfer<typeof donorListSchema>;
export type DonorCreate = ZodInfer<typeof donorCreateSchema>;
export type DonorUpdate = ZodInfer<typeof donorUpdateSchema>;
