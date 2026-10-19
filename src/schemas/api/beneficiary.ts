import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { addressFields, idSchema } from "./common";
import { estadoCivilSchema, tipoImovelSchema } from "./enums";

const beneficiaryFields = {
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
	tipoImovel: tipoImovelSchema.optional(),
	valorAluguel: z
		.number()
		.nonnegative({ error: "O valor do aluguel não pode ser negativo." })
		.optional(),
	estadoCivil: estadoCivilSchema.optional(),
	numeroAdultos: z.number().int().nonnegative().optional(),
	criancasPequenas: z.number().int().nonnegative().optional(),
	adolescentes: z.number().int().nonnegative().optional(),
	doentes: z.boolean().optional(),
	bolsaFamilia: z.boolean().optional(),
	aposentado: z.boolean().optional(),
	pensao: z.boolean().optional(),
	cestaBasica: z.boolean().optional(),
	atividadeRemunerada: z.boolean().optional(),
	renda: z
		.number()
		.nonnegative({ error: "A renda não pode ser negativa." })
		.optional(),
	criancaEscola: z.boolean().optional(),
	observacoes: z.string().trim().optional(),
};

export const beneficiarySchema = z
	.object({
	id: idSchema,
	...beneficiaryFields,
	})
	.strict();

export const beneficiaryListSchema = z
	.object({
	id: idSchema,
	name: beneficiaryFields.name,
	phone: beneficiaryFields.phone,
	email: beneficiaryFields.email,
	cidade: beneficiaryFields.cidade,
	uf: beneficiaryFields.uf,
	renda: beneficiaryFields.renda,
	tipoImovel: beneficiaryFields.tipoImovel,
	cestaBasica: beneficiaryFields.cestaBasica,
	})
	.strict();

export const beneficiaryCreateSchema = z.object(beneficiaryFields).strict();

export const beneficiaryUpdateSchema = z
	.object(beneficiaryFields)
	.partial()
	.strict();

export type Beneficiary = ZodInfer<typeof beneficiarySchema>;
export type BeneficiaryList = ZodInfer<typeof beneficiaryListSchema>;
export type BeneficiaryCreate = ZodInfer<typeof beneficiaryCreateSchema>;
export type BeneficiaryUpdate = ZodInfer<typeof beneficiaryUpdateSchema>;
