import {
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const UFS = [
	"AC", "AL", "AP", "AM", "BA",
	"CE", "DF", "ES", "GO", "MA",
	"MT", "MS", "MG", "PA", "PB",
	"PR", "PE", "PI", "RJ", "RN",
	"RS", "RO", "RR", "SC", "SP",
	"SE", "TO",
] as const;
export const TIPOS_IMOVEL = ["ALUGADO", "PROPRIO"] as const;
export const ESTADOS_CIVIS = [
	"SOLTEIRO",
	"CASADO",
	"DIVORCIADO",
	"VIUVO",
	"UNIAO_ESTAVEL",
] as const;

const contact = {
	id: text().primaryKey(),
	name: text().notNull(),
	phone: text(),
	email: text(),
	cep: text(),
	logradouro: text(),
	numero: text(),
	complemento: text(),
	bairro: text(),
	cidade: text(),
	uf: text({ enum: UFS }),
}

export const beneficiary = sqliteTable("beneficiary", {
	...contact,
	tipoImovel: text("tipo_imovel", { enum: TIPOS_IMOVEL }),
	valorAluguel: real("valor_aluguel"),
	estadoCivil: text("estado_civil", { enum: ESTADOS_CIVIS }),
	numeroAdultos: integer("numero_adultos"),
	criancasPequenas: integer("criancas_pequenas"),
	adolescentes: integer("adolescentes"),
	doentes: integer("doentes", { mode: "boolean" }),
	bolsaFamilia: integer("bolsa_familia", { mode: "boolean" }),
	aposentado: integer("aposentado", { mode: "boolean" }),
	pensao: integer("pensao", { mode: "boolean" }),
	cestaBasica: integer("cesta_basica", { mode: "boolean" }),
	atividadeRemunerada: integer("atividade_remunerada", { mode: "boolean" }),
	renda: real("renda"),
	criancaEscola: integer("crianca_escola", { mode: "boolean" }),
	observacoes: text("observacoes"),
});

export const donor = sqliteTable("donor", {
	...contact,
});
