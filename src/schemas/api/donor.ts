import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { addressFields, idSchema } from "./common";

export const donorFields = {
	name: z.string().trim().min(1, { error: "O nome não pode ficar em branco." }),
	phone: z.e164({ error: "O telefone precisa estar no formato E.164." }),
	email: z.email({ error: "O e-mail precisa ser válido." }).nullish(),
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
	})
	.strict();

export const donorCreateSchema = z.object(donorFields).strict();

export const donorUpdateSchema = z
	.object({
		name: donorFields.name.optional(),
		phone: donorFields.phone.optional(),
		email: donorFields.email,
		cep: donorFields.cep,
		logradouro: donorFields.logradouro,
		numero: donorFields.numero,
		complemento: donorFields.complemento,
		bairro: donorFields.bairro.optional(),
		cidade: donorFields.cidade.optional(),
		uf: donorFields.uf.optional(),
	})
	.strict();

export type Donor = ZodInfer<typeof donorSchema>;
export type DonorList = ZodInfer<typeof donorListSchema>;
export type DonorCreate = ZodInfer<typeof donorCreateSchema>;
export type DonorUpdate = ZodInfer<typeof donorUpdateSchema>;
