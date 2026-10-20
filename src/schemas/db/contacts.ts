import {
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import {
	ESTADOS_CIVIS,
	TIPOS_IMOVEL,
	UFS,
} from "../api/enums";

const contact = {
	id: text().primaryKey(),
	name: text().notNull(),
	phone: text().notNull(),
	email: text(),
	cep: text(),
	logradouro: text(),
	numero: text(),
	complemento: text(),
	bairro: text().notNull(),
	cidade: text().notNull(),
	uf: text({ enum: UFS }).notNull(),
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
