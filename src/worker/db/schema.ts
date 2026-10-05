import { sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/zod";
import { z } from "zod";
export * from "./auth-schema";

export const UFS = [
	"AC",
	"AL",
	"AP",
	"AM",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MT",
	"MS",
	"MG",
	"PA",
	"PB",
	"PR",
	"PE",
	"PI",
	"RJ",
	"RN",
	"RS",
	"RO",
	"RR",
	"SC",
	"SP",
	"SE",
	"TO",
] as const;

export const TIPOS_IMOVEL = ["ALUGADO", "PROPRIO"] as const;

export const ESTADOS_CIVIS = [
	"SOLTEIRO",
	"CASADO",
	"DIVORCIADO",
	"VIUVO",
	"UNIAO_ESTAVEL",
] as const;

export const UNITS = ["KG", "L", "UNIT", "PACK", "BOX"] as const;

export const STATUS_DONATION = ["DRAFT", "RECEIVED"] as const;

export const STATUS_DELIVERY = ["OPEN", "COMPLETED", "CANCELLED"] as const;

export const REASONS_ADJUSTMENT = [
	"STOCKTAKE",
	"DONOR_RETURN",
	"LOSS",
	"DAMAGE",
	"CORRECTION",
] as const;

const nomeNaoVazio = (schema: z.ZodString) =>
	schema.trim().min(1, { error: "O nome não pode ficar em branco." });

const naoNegativo = (schema: z.ZodNumber) =>
	schema.min(0, { error: "Não pode ser negativo." });

const inteiroNaoNegativo = () =>
	z
		.number()
		.int({ error: "Informe um número inteiro." })
		.min(0, { error: "Não pode ser negativo." });

const inteiro = () => z.number().int({ error: "Informe um número inteiro." });

const positiveQuantity = (schema: z.ZodNumber) =>
	schema.positive({ error: "A quantidade tem que ser maior que zero." });

const occurredAt = z.coerce.date();

const emailValido = () => z.email({ error: "E-mail inválido." });

const CEP_INVALIDO = "O CEP deve ter 8 dígitos.";

const cepComOitoDigitos = (schema: z.ZodString) =>
	schema.regex(/^\d{8}$/, { error: CEP_INVALIDO });

export const assistido = sqliteTable("assistido", {
	id: text("id").primaryKey(),
	nome: text("nome").notNull(),
	telefone: text("telefone"),
	email: text("email"),
	cep: text("cep"),
	logradouro: text("logradouro"),
	numero: text("numero"),
	complemento: text("complemento"),
	bairro: text("bairro"),
	cidade: text("cidade"),
	uf: text("uf", { enum: UFS }),
	tipoImovel: text("tipo_imovel", { enum: TIPOS_IMOVEL }),
	valorAluguel: integer("valor_aluguel"),
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

const assistidoRefinements = {
	nome: nomeNaoVazio,
	email: emailValido,
	cep: cepComOitoDigitos,
	valorAluguel: inteiroNaoNegativo,
	renda: naoNegativo,
	numeroAdultos: inteiroNaoNegativo,
	criancasPequenas: inteiroNaoNegativo,
	adolescentes: inteiroNaoNegativo,
};

export const assistidoInsertSchema = createInsertSchema(
	assistido,
	assistidoRefinements,
)
	.omit({ id: true })
	.strict();

export const assistidoUpdateSchema = createUpdateSchema(
	assistido,
	assistidoRefinements,
)
	.omit({ id: true })
	.strict();

export const assistidoSelectSchema = createSelectSchema(
	assistido,
	assistidoRefinements,
);

export const doador = sqliteTable("doador", {
	id: text("id").primaryKey(),
	nome: text("nome").notNull(),
	telefone: text("telefone"),
	email: text("email"),
	cep: text("cep"),
	logradouro: text("logradouro"),
	numero: text("numero"),
	complemento: text("complemento"),
	bairro: text("bairro"),
	cidade: text("cidade"),
	uf: text("uf", { enum: UFS }),
});

const doadorRefinements = {
	nome: nomeNaoVazio,
	email: emailValido,
	cep: cepComOitoDigitos,
};

export const doadorInsertSchema = createInsertSchema(doador, doadorRefinements)
	.omit({ id: true })
	.strict();

export const doadorUpdateSchema = createUpdateSchema(doador, doadorRefinements)
	.omit({ id: true })
	.strict();

export const doadorSelectSchema = createSelectSchema(doador, doadorRefinements);

export const itemCategory = sqliteTable(
	"item_category",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
	},
	(t) => [uniqueIndex("item_category_name_uniq").on(sql`lower(${t.name})`)],
);

const itemCategoryRefinements = { name: nomeNaoVazio };

export const itemCategoryInsertSchema = createInsertSchema(
	itemCategory,
	itemCategoryRefinements,
)
	.omit({ id: true })
	.strict();

export const itemCategoryUpdateSchema = createUpdateSchema(
	itemCategory,
	itemCategoryRefinements,
)
	.omit({ id: true })
	.strict();

export const itemCategorySelectSchema = createSelectSchema(
	itemCategory,
	itemCategoryRefinements,
);

export const inventoryItem = sqliteTable(
	"inventory_item",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		categoryId: text("category_id")
			.notNull()
			.references(() => itemCategory.id, { onDelete: "no action" }),
		unit: text("unit", { enum: UNITS }).notNull(),
		onHand: integer("on_hand").notNull().default(0),
		reservedQuantity: integer("reserved_quantity").notNull().default(0),
		available: integer("available").generatedAlwaysAs(
			sql`"on_hand" - "reserved_quantity"`,
			{ mode: "virtual" },
		),
	},
	(t) => [
		uniqueIndex("inventory_item_name_uniq").on(sql`lower(${t.name})`),
		index("inventory_item_categoryId_idx").on(t.categoryId),
	],
);

const inventoryItemRefinements = {
	name: nomeNaoVazio,
	onHand: inteiroNaoNegativo,
	reservedQuantity: inteiroNaoNegativo,
};

export const inventoryItemInsertSchema = createInsertSchema(
	inventoryItem,
	inventoryItemRefinements,
)
	.omit({ id: true, onHand: true, reservedQuantity: true })
	.strict();

export const inventoryItemUpdateSchema = createUpdateSchema(
	inventoryItem,
	inventoryItemRefinements,
)
	.omit({ id: true, onHand: true, reservedQuantity: true })
	.strict();

export const inventoryItemSelectSchema = createSelectSchema(
	inventoryItem,
	inventoryItemRefinements,
);

export const inventoryItemTableViewSchema = inventoryItemSelectSchema.omit({ categoryId: true }).extend({
  categoryName: itemCategorySelectSchema.shape.name.nullable(),
});

export const donation = sqliteTable(
	"donation",
	{
		id: text("id").primaryKey(),
		donorId: text("donor_id")
			.notNull()
			.references(() => doador.id, { onDelete: "no action" }),
		occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
		status: text("status", { enum: STATUS_DONATION })
			.notNull()
			.default("DRAFT"),
		note: text("note"),
	},
	(t) => [
		index("donation_donorId_idx").on(t.donorId),
		index("donation_status_idx").on(t.status),
	],
);

const donationRefinements = { occurredAt };

export const donationInsertSchema = createInsertSchema(
	donation,
	donationRefinements,
)
	.omit({ id: true, status: true })
	.strict();

export const donationUpdateSchema = createUpdateSchema(
	donation,
	donationRefinements,
)
	.omit({ id: true, status: true })
	.strict();

export const donationSelectSchema = createSelectSchema(
	donation,
	donationRefinements,
);

export const donationLine = sqliteTable(
	"donation_line",
	{
		donationId: text("donation_id")
			.notNull()
			.references(() => donation.id, { onDelete: "no action" }),
		inventoryItemId: text("inventory_item_id")
			.notNull()
			.references(() => inventoryItem.id, { onDelete: "no action" }),
		quantity: integer("quantity").notNull(),
	},
	(t) => [
		primaryKey({ columns: [t.donationId, t.inventoryItemId] }),
		index("donation_line_inventoryItemId_idx").on(t.inventoryItemId),
	],
);

const donationLineRefinements = { quantity: positiveQuantity };

export const donationLineInsertSchema = createInsertSchema(
	donationLine,
	donationLineRefinements,
).strict();

export const donationLineUpdateSchema = createUpdateSchema(
	donationLine,
	donationLineRefinements,
).strict();

export const donationLineSelectSchema = createSelectSchema(
	donationLine,
	donationLineRefinements,
);

export const delivery = sqliteTable(
	"delivery",
	{
		id: text("id").primaryKey(),
		beneficiaryId: text("beneficiary_id")
			.notNull()
			.references(() => assistido.id, { onDelete: "no action" }),
		occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
		status: text("status", { enum: STATUS_DELIVERY }).notNull().default("OPEN"),
		note: text("note"),
	},
	(t) => [
		index("delivery_beneficiaryId_idx").on(t.beneficiaryId),
		index("delivery_status_idx").on(t.status),
	],
);

const deliveryRefinements = { occurredAt };

export const deliveryInsertSchema = createInsertSchema(
	delivery,
	deliveryRefinements,
)
	.omit({ id: true, status: true })
	.strict();

export const deliveryUpdateSchema = createUpdateSchema(
	delivery,
	deliveryRefinements,
)
	.omit({ id: true, status: true })
	.strict();

export const deliverySelectSchema = createSelectSchema(
	delivery,
	deliveryRefinements,
);

export const deliveryLine = sqliteTable(
	"delivery_line",
	{
		deliveryId: text("delivery_id")
			.notNull()
			.references(() => delivery.id, { onDelete: "no action" }),
		inventoryItemId: text("inventory_item_id")
			.notNull()
			.references(() => inventoryItem.id, { onDelete: "no action" }),
		quantity: integer("quantity").notNull(),
	},
	(t) => [
		primaryKey({ columns: [t.deliveryId, t.inventoryItemId] }),
		index("delivery_line_inventoryItemId_idx").on(t.inventoryItemId),
	],
);

const deliveryLineRefinements = { quantity: positiveQuantity };

export const deliveryLineInsertSchema = createInsertSchema(
	deliveryLine,
	deliveryLineRefinements,
).strict();

export const deliveryLineUpdateSchema = createUpdateSchema(
	deliveryLine,
	deliveryLineRefinements,
).strict();

export const deliveryLineSelectSchema = createSelectSchema(
	deliveryLine,
	deliveryLineRefinements,
);

export const inventoryCount = sqliteTable("inventory_count", {
	id: text("id").primaryKey(),
	occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
	countedBy: text("counted_by"),
	note: text("note"),
});

const inventoryCountRefinements = { occurredAt };

export const inventoryCountInsertSchema = createInsertSchema(
	inventoryCount,
	inventoryCountRefinements,
)
	.omit({ id: true })
	.strict();

export const inventoryCountUpdateSchema = createUpdateSchema(
	inventoryCount,
	inventoryCountRefinements,
)
	.omit({ id: true })
	.strict();

export const inventoryCountSelectSchema = createSelectSchema(
	inventoryCount,
	inventoryCountRefinements,
);

export const inventoryCountLine = sqliteTable(
	"inventory_count_line",
	{
		countId: text("count_id")
			.notNull()
			.references(() => inventoryCount.id, { onDelete: "no action" }),
		inventoryItemId: text("inventory_item_id")
			.notNull()
			.references(() => inventoryItem.id, { onDelete: "no action" }),
		countedQuantity: integer("counted_quantity").notNull(),
	},
	(t) => [
		primaryKey({ columns: [t.countId, t.inventoryItemId] }),
		index("inventory_count_line_inventoryItemId_idx").on(t.inventoryItemId),
	],
);

const inventoryCountLineRefinements = {
	countedQuantity: inteiroNaoNegativo,
};

export const inventoryCountLineInsertSchema = createInsertSchema(
	inventoryCountLine,
	inventoryCountLineRefinements,
).strict();

export const inventoryCountLineUpdateSchema = createUpdateSchema(
	inventoryCountLine,
	inventoryCountLineRefinements,
).strict();

export const inventoryCountLineSelectSchema = createSelectSchema(
	inventoryCountLine,
	inventoryCountLineRefinements,
);

export const inventoryAdjustment = sqliteTable(
	"inventory_adjustment",
	{
		id: text("id").primaryKey(),
		inventoryItemId: text("inventory_item_id")
			.notNull()
			.references(() => inventoryItem.id, { onDelete: "no action" }),
		delta: integer("delta").notNull(),
		reason: text("reason", { enum: REASONS_ADJUSTMENT }).notNull(),
		occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
		countId: text("count_id").references(() => inventoryCount.id, {
			onDelete: "no action",
		}),
	},
	(t) => [
		index("inventory_adjustment_inventoryItemId_idx").on(t.inventoryItemId),
		index("inventory_adjustment_countId_idx").on(t.countId),
	],
);

const inventoryAdjustmentRefinements = {
	delta: inteiro,
	occurredAt,
};

export const inventoryAdjustmentInsertSchema = createInsertSchema(
	inventoryAdjustment,
	inventoryAdjustmentRefinements,
)
	.omit({ id: true })
	.strict();

export const inventoryAdjustmentUpdateSchema = createUpdateSchema(
	inventoryAdjustment,
	inventoryAdjustmentRefinements,
)
	.omit({ id: true })
	.strict();

export const inventoryAdjustmentSelectSchema = createSelectSchema(
	inventoryAdjustment,
	inventoryAdjustmentRefinements,
);
