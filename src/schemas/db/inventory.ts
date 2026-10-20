import { sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { ADJUSTMENT_REASON, LEDGER_KIND, UNITS } from "../api/enums";
import { beneficiary, donor } from "./contacts";

export const STATUS_DONATION = ["RECEIVED", "VOID"] as const;
export const STATUS_DELIVERY = ["OPEN", "COMPLETED", "CANCELLED"] as const;

export const category = sqliteTable(
	"item_category",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
	},
	(t) => [uniqueIndex("item_category_name_uniq").on(sql`lower(${t.name})`)],
);

export const item = sqliteTable(
	"inventory_item",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		categoryId: text("category_id")
			.notNull()
			.references(() => category.id, { onDelete: "no action" }),
		unit: text("unit", { enum: UNITS }).notNull(),
		onHand: integer("on_hand").notNull().default(0),
		reserved: integer("reserved").notNull().default(0),
		available: integer("available").generatedAlwaysAs(
			sql`"on_hand" - "reserved"`,
		),
	},
	(t) => [
		uniqueIndex("inventory_item_name_uniq").on(sql`lower(${t.name})`),
		index("inventory_item_categoryId_idx").on(t.categoryId),
	],
);

export const donation = sqliteTable(
	"donation",
	{
		id: text("id").primaryKey(),
		donorId: text("donor_id")
			.notNull()
			.references(() => donor.id, { onDelete: "no action" }),
		occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
		status: text("status", { enum: STATUS_DONATION })
			.notNull()
			.default("RECEIVED"),
		note: text("note"),
	},
	(t) => [
		index("donation_donorId_idx").on(t.donorId),
		index("donation_status_idx").on(t.status),
	],
);

export const delivery = sqliteTable(
	"delivery",
	{
		id: text("id").primaryKey(),
		beneficiaryId: text("beneficiary_id")
			.notNull()
			.references(() => beneficiary.id, { onDelete: "no action" }),
		occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
		status: text("status", { enum: STATUS_DELIVERY }).notNull().default("OPEN"),
		note: text("note"),
	},
	(t) => [
		index("delivery_beneficiaryId_idx").on(t.beneficiaryId),
		index("delivery_status_idx").on(t.status),
	],
);

/**
 * O ledger é a fonte da verdade do estoque: cada linha é um movimento, e o
 * saldo é a soma delas. `on_hand` e `reserved` em `inventory_item` são cache
 * reconstruível. `ref_id` é uma referência polimórfica — o documento depende
 * do `kind` — e por isso não é uma constraint: a integridade é conferida por
 * consulta, que vira teste.
 */
export const ledger = sqliteTable(
	"ledger",
	{
		seq: integer("seq").primaryKey({ autoIncrement: true }),
		id: text("id").notNull().unique(),
		itemId: text("item_id")
			.notNull()
			.references(() => item.id, { onDelete: "no action" }),
		kind: text("kind", { enum: LEDGER_KIND }).notNull(),
		onHandDelta: integer("on_hand_delta").notNull().default(0),
		reservedDelta: integer("reserved_delta").notNull().default(0),
		countedQuantity: integer("counted_quantity"),
		refId: text("ref_id").notNull(),
		occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
	},
	(t) => [
		uniqueIndex("ledger_kind_ref_item_uniq").on(t.kind, t.refId, t.itemId),
		index("ledger_ref_idx").on(t.refId, t.kind, t.itemId),
		index("ledger_item_idx").on(t.itemId, t.seq),
	],
);

export const inventoryCount = sqliteTable("inventory_count", {
	id: text("id").primaryKey(),
	occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
	countedBy: text("counted_by"),
	note: text("note"),
});

export const inventoryAdjustment = sqliteTable(
	"inventory_adjustment",
	{
		id: text("id").primaryKey(),
		itemId: text("inventory_item_id")
			.notNull()
			.references(() => item.id, { onDelete: "no action" }),
		delta: integer("delta").notNull(),
		reason: text("reason", { enum: ADJUSTMENT_REASON }).notNull(),
		occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
		countId: text("count_id").references(() => inventoryCount.id, {
			onDelete: "no action",
		}),
	},
	(t) => [
		index("inventory_adjustment_itemId_idx").on(t.itemId),
		index("inventory_adjustment_countId_idx").on(t.countId),
	],
);

export const reconciliation = sqliteTable("reconciliation", {
	id: text("id").primaryKey(),
	runAt: integer("run_at", { mode: "timestamp" }).notNull(),
	ok: integer("ok", { mode: "boolean" }).notNull(),
	driftedItems: integer("drifted_items").notNull().default(0),
	detail: text("detail"),
});
