import { eq, inArray } from "drizzle-orm";
import type { Hono } from "hono";
import { z } from "zod";
import {
  delivery,
  deliveryInsertSchema,
  deliveryLine,
  donationLine,
  deliveryUpdateSchema,
  donation,
  donationInsertSchema,
  donationLineInsertSchema,
  donationUpdateSchema,
  inventoryAdjustment,
  inventoryAdjustmentInsertSchema,
  inventoryCount,
  inventoryCountInsertSchema,
  inventoryCountLineInsertSchema,
  inventoryItem,
  itemCategory,
  itemCategoryInsertSchema,
  itemCategoryUpdateSchema,
} from "../db/schema";
import { apiError, parseBody, readJsonObject } from "./errors";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { InferSelectModel } from "drizzle-orm";
import {
	type ApiBindings,
	dbOf,
	findById,
	rawOf,
	registerResource,
} from "./resource";



const INSERT_DONATION = `
	INSERT INTO donation (id, donor_id, occurred_at, status, note)
	VALUES (?1, ?2, ?3, 'DRAFT', ?4)`;

const INSERT_DONATION_LINE = `
	INSERT INTO donation_line (donation_id, inventory_item_id, quantity)
	VALUES (?1, ?2, ?3)`;

const CREDIT_DONATION = `
	UPDATE inventory_item SET on_hand = on_hand + COALESCE((
		SELECT SUM(quantity) FROM donation_line
		WHERE donation_id = ?1 AND inventory_item_id = inventory_item.id
	), 0)
	WHERE id IN (SELECT inventory_item_id FROM donation_line WHERE donation_id = ?1)
		AND EXISTS (SELECT 1 FROM donation WHERE id = ?1 AND status = 'DRAFT')`;

const RECEIVE_DONATION = `
	UPDATE donation SET status = 'RECEIVED' WHERE id = ?1 AND status = 'DRAFT'`;

const INSERT_DELIVERY = `
	INSERT INTO delivery (id, beneficiary_id, occurred_at, status, note)
	VALUES (?1, ?2, ?3, 'OPEN', ?4)`;

const INSERT_DELIVERY_LINE = `
	INSERT INTO delivery_line (delivery_id, inventory_item_id, quantity)
	VALUES (?1, ?2, ?3)`;

const RESERVE_STOCK = `
	UPDATE inventory_item SET reserved_quantity = reserved_quantity + ?2
	WHERE id = ?1 AND on_hand - reserved_quantity >= ?2`;

const CONSUME_STOCK = `
	UPDATE inventory_item
	SET on_hand = on_hand - ?2, reserved_quantity = reserved_quantity - ?2
	WHERE id = ?1 AND reserved_quantity >= ?2
		AND EXISTS (SELECT 1 FROM delivery WHERE id = ?3 AND status = 'OPEN')`;

const RELEASE_STOCK = `
	UPDATE inventory_item SET reserved_quantity = reserved_quantity - ?2
	WHERE id = ?1 AND reserved_quantity >= ?2
		AND EXISTS (SELECT 1 FROM delivery WHERE id = ?3 AND status = 'OPEN')`;

const COMPLETE_DELIVERY = `
	UPDATE delivery SET status = 'COMPLETED' WHERE id = ?1 AND status = 'OPEN'`;

const CANCEL_DELIVERY = `
	UPDATE delivery SET status = 'CANCELLED' WHERE id = ?1 AND status = 'OPEN'`;

const DELETE_DELIVERY_LINES = `DELETE FROM delivery_line WHERE delivery_id = ?1`;
const DELETE_DELIVERY = `DELETE FROM delivery WHERE id = ?1`;

const INSERT_COUNT = `
	INSERT INTO inventory_count (id, occurred_at, counted_by, note)
	VALUES (?1, ?2, ?3, ?4)`;

const INSERT_COUNT_LINE = `
	INSERT INTO inventory_count_line (count_id, inventory_item_id, counted_quantity)
	VALUES (?1, ?2, ?3)`;

const INSERT_STOCKTAKE = `
	INSERT INTO inventory_adjustment (id, inventory_item_id, delta, reason, occurred_at, count_id)
	VALUES (?1, ?2, ?3, 'STOCKTAKE', ?4, ?5)`;

const SET_ON_HAND = `UPDATE inventory_item SET on_hand = ?3 WHERE id = ?2`;

const INSERT_ADJUSTMENT = `
	INSERT INTO inventory_adjustment (id, inventory_item_id, delta, reason, occurred_at)
	VALUES (?1, ?2, ?3, ?4, ?5)`;

const APPLY_DELTA = `
	UPDATE inventory_item SET on_hand = on_hand + ?3 WHERE id = ?2 AND on_hand + ?3 >= 0`;

const DELETE_ADJUSTMENT = `DELETE FROM inventory_adjustment WHERE id = ?1`;

const ADJUSTMENT_REASONS = ["DONOR_RETURN", "LOSS", "DAMAGE"] as const;

const linePayloadSchema = donationLineInsertSchema.omit({ donationId: true });

const donationCreateSchema = donationInsertSchema.extend({
	lines: z.array(linePayloadSchema).min(1, {
		error: "A donation needs at least one line.",
	}),
});

const deliveryCreateSchema = deliveryInsertSchema.extend({
	lines: z.array(linePayloadSchema).min(1, {
		error: "A delivery needs at least one line.",
	}),
});

const countCreateSchema = inventoryCountInsertSchema.extend({
	lines: z
		.array(inventoryCountLineInsertSchema.omit({ countId: true }))
		.min(1, { error: "A count needs at least one line." }),
});

const adjustmentCreateSchema = inventoryAdjustmentInsertSchema
	.omit({ countId: true })
	.extend({ reason: z.enum(ADJUSTMENT_REASONS) });

async function withDonationLines(
	db: DrizzleD1Database,
	record: InferSelectModel<typeof donation>,
) {
	const lines = await db
		.select({
			inventoryItemId: donationLine.inventoryItemId,
			quantity: donationLine.quantity,
		})
		.from(donationLine)
		.where(eq(donationLine.donationId, record.id));

	return { ...record, lines };
}

async function withDeliveryLines(
	db: DrizzleD1Database,
	record: InferSelectModel<typeof delivery>,
) {
	const lines = await db
		.select({
			inventoryItemId: deliveryLine.inventoryItemId,
			quantity: deliveryLine.quantity,
		})
		.from(deliveryLine)
		.where(eq(deliveryLine.deliveryId, record.id));

	return { ...record, lines };
}

function seconds(date: Date): number {
	return Math.floor(date.getTime() / 1000);
}

function rejectRepeatedItem(ids: string[], noun: string) {
	if (new Set(ids).size !== ids.length) {
		throw apiError(
			400,
			"INVALID_VALUE",
			`An item cannot appear twice in the same ${noun}.`,
		);
	}
}

function insufficientStock(count: number) {
	const message =
		count === 1
			? "One of the items does not have enough stock available."
			: `${count} of the items do not have enough stock available.`;

	return apiError(409, "INSUFFICIENT_STOCK", message);
}

function invalidTransition(message: string) {
	return apiError(400, "INVALID_TRANSITION", message);
}

function drifted() {
	return apiError(
		409,
		"CONFLICT",
		"The reserved stock no longer covers this operation.",
	);
}

async function reservedByItem(
  db: ReturnType<typeof dbOf>,
  ids: string[],
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      id: inventoryItem.id,
      reservedQuantity: inventoryItem.reservedQuantity,
    })
    .from(inventoryItem)
    .where(inArray(inventoryItem.id, ids));

  return new Map(rows.map((row) => [row.id, row.reservedQuantity]));
}



export function registerStock(app: Hono<ApiBindings>) {
  registerResource(app, {
    table: itemCategory,
    path: "item-categories",
    name: "Item category",
    schemas: {
      insert: itemCategoryInsertSchema,
      update: itemCategoryUpdateSchema,
    },
  });



	registerResource(app, {
		table: donation,
		path: "donations",
		name: "Donation",
		schemas: {
			insert: donationInsertSchema,
			update: donationUpdateSchema,
		},
		create: false,
		detail: withDonationLines,
	});

	app.post("/donations", async (c) => {
		const raw = rawOf(c);
		const { lines, ...payload } = parseBody(
			await readJsonObject(c),
			donationCreateSchema,
			"create",
		);
		rejectRepeatedItem(
			lines.map((line) => line.inventoryItemId),
			"donation",
		);

		const id = crypto.randomUUID();

		await raw.batch([
			raw
				.prepare(INSERT_DONATION)
				.bind(
					id,
					payload.donorId,
					seconds(payload.occurredAt),
					payload.note ?? null,
				),
			...lines.map((line) =>
				raw
					.prepare(INSERT_DONATION_LINE)
					.bind(id, line.inventoryItemId, line.quantity),
			),
		]);

		const data = await findById(dbOf(c), donation, id, "Donation");
		c.header("Location", `${c.req.path}/${id}`);
		return c.json({ data }, 201);
	});

	app.post("/donations/:id/receive", async (c) => {
		const raw = rawOf(c);
		const id = c.req.param("id");
		const existing = await findById(dbOf(c), donation, id, "Donation");

		if (existing.status !== "DRAFT") {
			throw invalidTransition(
				`Cannot receive a donation in status ${existing.status}.`,
			);
		}

		await raw.batch([
			raw.prepare(CREDIT_DONATION).bind(id),
			raw.prepare(RECEIVE_DONATION).bind(id),
		]);

		const data = await findById(dbOf(c), donation, id, "Donation");
		return c.json({ data });
	});

	registerResource(app, {
		table: delivery,
		path: "deliveries",
		name: "Delivery",
		schemas: {
			insert: deliveryInsertSchema,
			update: deliveryUpdateSchema,
		},
		create: false,
		detail: withDeliveryLines,
	});

	app.post("/deliveries", async (c) => {
		const raw = rawOf(c);
		const { lines, ...payload } = parseBody(
			await readJsonObject(c),
			deliveryCreateSchema,
			"create",
		);
		rejectRepeatedItem(
			lines.map((line) => line.inventoryItemId),
			"delivery",
		);

		const id = crypto.randomUUID();

		const results = await raw.batch([
			raw
				.prepare(INSERT_DELIVERY)
				.bind(
					id,
					payload.beneficiaryId,
					seconds(payload.occurredAt),
					payload.note ?? null,
				),
			...lines.map((line) =>
				raw
					.prepare(INSERT_DELIVERY_LINE)
					.bind(id, line.inventoryItemId, line.quantity),
			),
			...lines.map((line) =>
				raw.prepare(RESERVE_STOCK).bind(line.inventoryItemId, line.quantity),
			),
		]);

		const reserveResults = results.slice(1 + lines.length);
		const short = reserveResults.filter(
			(result) => result.meta.changes === 0,
		).length;

		if (short > 0) {
			const reservedItems = lines.filter(
				(_, i) => reserveResults[i].meta.changes !== 0,
			);

			await raw.batch([
				...reservedItems.map((line) =>
					raw
						.prepare(RELEASE_STOCK)
						.bind(line.inventoryItemId, line.quantity, id),
				),
				raw.prepare(DELETE_DELIVERY_LINES).bind(id),
				raw.prepare(DELETE_DELIVERY).bind(id),
			]);

			throw insufficientStock(short);
		}

		const data = await findById(dbOf(c), delivery, id, "Delivery");
		c.header("Location", `${c.req.path}/${id}`);
		return c.json({ data }, 201);
	});

	app.post("/deliveries/:id/complete", async (c) => {
		const raw = rawOf(c);
		const db = dbOf(c);
		const id = c.req.param("id");
		const existing = await findById(db, delivery, id, "Delivery");

		if (existing.status !== "OPEN") {
			throw invalidTransition(
				`Cannot complete a delivery in status ${existing.status}.`,
			);
		}

		const lines = await db
			.select()
			.from(deliveryLine)
			.where(eq(deliveryLine.deliveryId, id));

		const reserved = await reservedByItem(
			db,
			lines.map((line) => line.inventoryItemId),
		);
		const withoutReserve = lines.filter(
			(line) => (reserved.get(line.inventoryItemId) ?? 0) < line.quantity,
		);
		if (withoutReserve.length > 0) {
			throw drifted();
		}

		const results = await raw.batch([
			...lines.map((line) =>
				raw
					.prepare(CONSUME_STOCK)
					.bind(line.inventoryItemId, line.quantity, id),
			),
			raw.prepare(COMPLETE_DELIVERY).bind(id),
		]);

		if (results.some((result) => result.meta.changes === 0)) {
			console.error({
				deliveryId: id,
				reserved: [...reserved],
				lines: lines.map((line) => ({
					inventoryItemId: line.inventoryItemId,
					quantity: line.quantity,
				})),
			});
			throw drifted();
		}

		const data = await findById(db, delivery, id, "Delivery");
		return c.json({ data });
	});

	app.post("/deliveries/:id/cancel", async (c) => {
		const raw = rawOf(c);
		const db = dbOf(c);
		const id = c.req.param("id");
		const existing = await findById(db, delivery, id, "Delivery");

		if (existing.status !== "OPEN") {
			throw invalidTransition(
				`Cannot cancel a delivery in status ${existing.status}.`,
			);
		}

		const lines = await db
			.select()
			.from(deliveryLine)
			.where(eq(deliveryLine.deliveryId, id));

		const reserved = await reservedByItem(
			db,
			lines.map((line) => line.inventoryItemId),
		);
		const withoutReserve = lines.filter(
			(line) => (reserved.get(line.inventoryItemId) ?? 0) < line.quantity,
		);
		if (withoutReserve.length > 0) {
			throw drifted();
		}

		const results = await raw.batch([
			...lines.map((line) =>
				raw
					.prepare(RELEASE_STOCK)
					.bind(line.inventoryItemId, line.quantity, id),
			),
			raw.prepare(CANCEL_DELIVERY).bind(id),
		]);

		if (results.some((result) => result.meta.changes === 0)) {
			console.error({
				deliveryId: id,
				reserved: [...reserved],
				lines: lines.map((line) => ({
					inventoryItemId: line.inventoryItemId,
					quantity: line.quantity,
				})),
			});
			throw drifted();
		}

		const data = await findById(db, delivery, id, "Delivery");
		return c.json({ data });
	});

	app.post("/inventory-counts", async (c) => {
		const db = dbOf(c);
		const raw = rawOf(c);
		const { lines, ...payload } = parseBody(
			await readJsonObject(c),
			countCreateSchema,
			"create",
		);
		rejectRepeatedItem(
			lines.map((line) => line.inventoryItemId),
			"count",
		);

		const stock = new Map(
			(
				await db
					.select({
						id: inventoryItem.id,
						onHand: inventoryItem.onHand,
						reservedQuantity: inventoryItem.reservedQuantity,
					})
					.from(inventoryItem)
					.where(
						inArray(
							inventoryItem.id,
							lines.map((line) => line.inventoryItemId),
						),
					)
			).map((row) => [row.id, row]),
		);

		const unknownItems = lines.filter(
			(line) => !stock.has(line.inventoryItemId),
		);
		if (unknownItems.length > 0) {
			throw apiError(
				400,
				"INVALID_REFERENCE",
				"One of the references sent does not exist.",
			);
		}

		const belowReserved = lines.filter(
			(line) =>
				line.countedQuantity <
				(stock.get(line.inventoryItemId)?.reservedQuantity ?? 0),
		);
		if (belowReserved.length > 0) {
			throw insufficientStock(belowReserved.length);
		}

		const id = crypto.randomUUID();
		const occurredAt = seconds(payload.occurredAt);

		await raw.batch([
			raw
				.prepare(INSERT_COUNT)
				.bind(id, occurredAt, payload.countedBy ?? null, payload.note ?? null),
			...lines.map((line) =>
				raw
					.prepare(INSERT_COUNT_LINE)
					.bind(id, line.inventoryItemId, line.countedQuantity),
			),
			...lines.map((line) =>
				raw
					.prepare(INSERT_STOCKTAKE)
					.bind(
						crypto.randomUUID(),
						line.inventoryItemId,
						line.countedQuantity -
							(stock.get(line.inventoryItemId)?.onHand ?? 0),
						occurredAt,
						id,
					),
			),
			...lines.map((line) =>
				raw
					.prepare(SET_ON_HAND)
					.bind(null, line.inventoryItemId, line.countedQuantity),
			),
		]);

		const data = await findById(db, inventoryCount, id, "Inventory count");
		c.header("Location", `${c.req.path}/${id}`);
		return c.json({ data }, 201);
	});

	app.post("/inventory-adjustments", async (c) => {
		const raw = rawOf(c);
		const payload = parseBody(
			await readJsonObject(c),
			adjustmentCreateSchema,
			"create",
		);

		const id = crypto.randomUUID();

		const results = await raw.batch([
			raw
				.prepare(INSERT_ADJUSTMENT)
				.bind(
					id,
					payload.inventoryItemId,
					payload.delta,
					payload.reason,
					seconds(payload.occurredAt),
				),
			raw.prepare(APPLY_DELTA).bind(id, payload.inventoryItemId, payload.delta),
		]);

		if (results[1].meta.changes === 0) {
			await raw.prepare(DELETE_ADJUSTMENT).bind(id).run();
			throw apiError(
				409,
				"CONFLICT",
				"The adjustment would leave the stock below zero.",
			);
		}

		const data = await findById(
			dbOf(c),
			inventoryAdjustment,
			id,
			"Inventory adjustment",
		);
		c.header("Location", `${c.req.path}/${id}`);
		return c.json({ data }, 201);
	});
}
