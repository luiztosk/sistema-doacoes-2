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
    email: z.email().optional(),
    phone: z.e164(),
    cep: z.string().regex(/^\d{8}$/).optional(),
    logradouro: z.string().trim().min(1).optional(),
    numero: z.string().trim().min(1).optional(),
    complemento: z.string().trim().optional(),
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
    valorAluguel: z.number().nonnegative().optional(),
    renda: z.number().nonnegative().optional(),
    numeroAdultos: z.number().int().nonnegative().optional(),
    criancasPequenas: z.number().int().nonnegative().optional(),
    adolescentes: z.number().int().nonnegative().optional(),
    doentes: z.boolean().optional(),
    bolsaFamilia: z.boolean().optional(),
    aposentado: z.boolean().optional(),
    pensao: z.boolean().optional(),
    cestaBasica: z.boolean().optional(),
    atividadeRemunerada: z.boolean().optional(),
    criancaEscola: z.boolean().optional(),
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
    .strict();

export const donorUpdateSchema = createUpdateSchema(
    donor, 
    donorRefinements
)
    .strict();

export const donorSelectSchema = createSelectSchema(
    donor, 
    donorRefinements
);