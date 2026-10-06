import { sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { beneficiary, donor } from "./contacts";

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

export const itemCategory = sqliteTable(
	"item_category",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
	},
	(t) => [uniqueIndex("item_category_name_uniq").on(sql`lower(${t.name})`)],
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
			.default("DRAFT"),
		note: text("note"),
	},
	(t) => [
		index("donation_donorId_idx").on(t.donorId),
		index("donation_status_idx").on(t.status),
	],
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

export const inventoryCount = sqliteTable("inventory_count", {
	id: text("id").primaryKey(),
	occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
	countedBy: text("counted_by"),
	note: text("note"),
});

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
