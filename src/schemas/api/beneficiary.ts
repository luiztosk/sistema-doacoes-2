import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import { addressFields, idSchema } from "./common";
import { estadoCivilSchema, tipoImovelSchema, ufSchema } from "./enums";

export const beneficiaryFields = {
	name: z.string().trim().min(1, { error: "O nome não pode ficar em branco." }),
	phone: z.e164({ error: "O telefone precisa estar no formato E.164." }),
	email: z.email({ error: "O e-mail precisa ser válido." }).nullish(),
	...addressFields,
	tipoImovel: tipoImovelSchema.nullish(),
	valorAluguel: z.number().nonnegative().nullish(),
	estadoCivil: estadoCivilSchema.nullish(),
	numeroAdultos: z.number().int().nonnegative().nullish(),
	criancasPequenas: z.number().int().nonnegative().nullish(),
	adolescentes: z.number().int().nonnegative().nullish(),
	doentes: z.boolean().nullish(),
	bolsaFamilia: z.boolean().nullish(),
	aposentado: z.boolean().nullish(),
	pensao: z.boolean().nullish(),
	cestaBasica: z.boolean().nullish(),
	atividadeRemunerada: z.boolean().nullish(),
	renda: z.number().nonnegative().nullish(),
	criancaEscola: z.boolean().nullish(),
	observacoes: z.string().trim().nullish(),
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
		uf: ufSchema.nullish(),
		renda: beneficiaryFields.renda,
		tipoImovel: beneficiaryFields.tipoImovel,
		cestaBasica: beneficiaryFields.cestaBasica,
	})
	.strict();

export const beneficiaryCreateSchema = z.object(beneficiaryFields).strict();

export const beneficiaryUpdateSchema = z
	.object({
		name: beneficiaryFields.name.optional(),
		phone: beneficiaryFields.phone.optional(),
		email: beneficiaryFields.email,
		cep: beneficiaryFields.cep,
		logradouro: beneficiaryFields.logradouro,
		numero: beneficiaryFields.numero,
		complemento: beneficiaryFields.complemento,
		bairro: beneficiaryFields.bairro.optional(),
		cidade: beneficiaryFields.cidade.optional(),
		uf: ufSchema.optional(),
		tipoImovel: beneficiaryFields.tipoImovel,
		valorAluguel: beneficiaryFields.valorAluguel,
		estadoCivil: beneficiaryFields.estadoCivil,
		numeroAdultos: beneficiaryFields.numeroAdultos,
		criancasPequenas: beneficiaryFields.criancasPequenas,
		adolescentes: beneficiaryFields.adolescentes,
		doentes: beneficiaryFields.doentes,
		bolsaFamilia: beneficiaryFields.bolsaFamilia,
		aposentado: beneficiaryFields.aposentado,
		pensao: beneficiaryFields.pensao,
		cestaBasica: beneficiaryFields.cestaBasica,
		atividadeRemunerada: beneficiaryFields.atividadeRemunerada,
		renda: beneficiaryFields.renda,
		criancaEscola: beneficiaryFields.criancaEscola,
		observacoes: beneficiaryFields.observacoes,
	})
	.strict();

export type Beneficiary = ZodInfer<typeof beneficiarySchema>;
export type BeneficiaryList = ZodInfer<typeof beneficiaryListSchema>;
export type BeneficiaryCreate = ZodInfer<typeof beneficiaryCreateSchema>;
export type BeneficiaryUpdate = ZodInfer<typeof beneficiaryUpdateSchema>;
