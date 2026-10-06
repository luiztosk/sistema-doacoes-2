import { z } from "zod";
import type { infer as ZodInfer } from "zod";
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from "drizzle-orm/zod";
import { beneficiary, donor, ESTADOS_CIVIS, TIPOS_IMOVEL, UFS } from "../db/contacts";

const contactRefinements = {
    id: z.uuid(),
    name: z.string().trim().min(1),
    email: z.email(),
    phone: z.e164(),
    cep: z.string().regex(/^\d{8}$/),
    logradouro: z.string().trim().min(1),
    numero: z.string().trim().min(1),
    complemento: z.string().trim(),
    bairro: z.string().trim().min(1),
    cidade: z.string().trim().min(1),
    uf: z.enum(UFS),
};

export type BeneficiarySelect = ZodInfer<typeof beneficiarySelectSchema>;
export type BeneficiaryInsert = ZodInfer<typeof beneficiaryInsertSchema>;
export type BeneficiaryUpdate = ZodInfer<typeof beneficiaryUpdateSchema>;
export type BeneficiaryTableView = Pick<
    ZodInfer<typeof beneficiarySelectSchema>,
    "id" | "name" | "cidade" | "uf" | "phone" | "email" | "renda" | "tipoImovel" | "cestaBasica"
>;

const beneficiaryRefinements = {
    ...contactRefinements,
    tipoImovel: z.enum(TIPOS_IMOVEL),
    estadoCivil: z.enum(ESTADOS_CIVIS),
    valorAluguel: z.number().nonnegative(),
    renda: z.number().nonnegative(),
    numeroAdultos: z.number().int().nonnegative(),
    criancasPequenas: z.number().int().nonnegative(),
    adolescentes: z.number().int().nonnegative(),
    doentes: z.boolean(),
    bolsaFamilia: z.boolean(),
    aposentado: z.boolean(),
    pensao: z.boolean(),
    cestaBasica: z.boolean(),
    atividadeRemunerada: z.boolean(),
    criancaEscola: z.boolean(),
};

export const beneficiaryInsertSchema = createInsertSchema(
    beneficiary,
    beneficiaryRefinements,
)
    .omit({ id: true })
    .strict();

export const beneficiaryUpdateSchema = createUpdateSchema(
    beneficiary,
    beneficiaryRefinements,
)
    .strict();

export const beneficiarySelectSchema = createSelectSchema(
    beneficiary,
    beneficiaryRefinements,
);

const donorRefinements = {
    ...contactRefinements
};

export type DonorSelect = ZodInfer<typeof donorSelectSchema>;
export type DonorInsert = ZodInfer<typeof donorInsertSchema>;
export type DonorUpdate = ZodInfer<typeof donorUpdateSchema>;
export type DonorTableView = Pick<
    ZodInfer<typeof donorSelectSchema>,
    "id" | "name" | "cidade" | "uf" | "phone" | "email"
>;

export const donorInsertSchema = createInsertSchema(
    donor, 
    donorRefinements
)
    .omit({ id: true })
    .strict();

export const donorUpdateSchema = createUpdateSchema(
    donor, 
    donorRefinements
)
    .omit({ id: true })
    .strict();

export const donorSelectSchema = createSelectSchema(
    donor, 
    donorRefinements
);