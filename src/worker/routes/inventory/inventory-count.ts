import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { dataListOf, dataOf, idParamsSchema } from "../../../schemas/api/common";
import {
	inventoryCountCreateSchema,
	inventoryCountListSchema,
	inventoryCountSchema,
} from "../../../schemas/api/inventory-count";
import {
	inventoryAdjustment,
	inventoryCount,
	ledger,
} from "../../../schemas/db/inventory";
import { app } from "../../app";
import { apiError, notFoundError } from "../../api/errors";
import { parseResponse } from "../../api/response";
import { defineWorkerRoute } from "../../api/route";
import {
	ledgerBalances,
	stockBatch,
	toEntries,
} from "../../api/stock";

const Count = app.openAPIRegistry.register("InventoryCount", inventoryCountSchema);
const CountList = app.openAPIRegistry.register(
	"InventoryCountList",
	inventoryCountListSchema,
);

const endpoint = "/api/v1/inventory-counts";

const getCountsRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: endpoint,
		responses: {
			200: {
				description: "Inventory count list",
				content: { "application/json": { schema: dataListOf(CountList) } },
			},
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const rows = await db.select().from(inventoryCount).all();

		const data = rows.map((row) => ({
			...row,
			occurredAt: row.occurredAt.toISOString(),
		}));

		return c.json(
			{ data: parseResponse(inventoryCountListSchema.array(), data) },
			200,
		);
	},
});

const getCountRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Inventory count",
				content: { "application/json": { schema: dataOf(Count) } },
			},
			404: { description: "Inventory count not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [row] = await db
			.select()
			.from(inventoryCount)
			.where(eq(inventoryCount.id, id))
			.limit(1);

		if (!row) throw notFoundError("Inventory count not found.");

		const items = await db
			.select({
				itemId: ledger.itemId,
				countedQuantity: ledger.countedQuantity,
			})
			.from(ledger)
			.where(eq(ledger.refId, id));

		return c.json(
			{
				data: parseResponse(inventoryCountSchema, {
					...row,
					occurredAt: row.occurredAt.toISOString(),
					items,
				}),
			},
			200,
		);
	},
});

const createCountRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: endpoint,
		request: {
			body: {
				content: {
					"application/json": { schema: inventoryCountCreateSchema },
				},
			},
		},
		responses: {
			201: {
				description: "Inventory count created",
				content: { "application/json": { schema: dataOf(Count) } },
			},
			400: { description: "Invalid input" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const payload = c.req.valid("json");

		const itemIds = payload.items.map((entry) => entry.itemId);
		if (new Set(itemIds).size !== itemIds.length) {
			throw apiError(
				400,
				"INVALID_VALUE",
				"An item cannot appear twice in the same count.",
			);
		}

		const balances = await ledgerBalances(db, itemIds);

		const id = crypto.randomUUID();
		const occurredAt = new Date(payload.occurredAt);

		const deltas = payload.items.map((entry) => {
			const onHand = balances.get(entry.itemId)?.onHand ?? 0;
			return { entry, delta: entry.countedQuantity - onHand };
		});

		const entries = toEntries(
			deltas.map(({ entry, delta }) => ({
				itemId: entry.itemId,
				kind: "COUNT" as const,
				onHandDelta: delta,
				reservedDelta: 0,
				countedQuantity: entry.countedQuantity,
			})),
			id,
			occurredAt,
		);

		await db.batch(
			stockBatch(
				db,
				entries,
				[
					db.insert(inventoryCount).values({
						id,
						occurredAt,
						countedBy: payload.countedBy ?? null,
						note: payload.note ?? null,
					}),
					db.insert(inventoryAdjustment).values(
						deltas.map(({ entry, delta }) => ({
							id: crypto.randomUUID(),
							itemId: entry.itemId,
							delta,
							reason: "STOCKTAKE" as const,
							occurredAt,
							countId: id,
						})),
					),
				],
			),
		);

		const [row] = await db
			.select()
			.from(inventoryCount)
			.where(eq(inventoryCount.id, id))
			.limit(1);

		c.header("Location", `${endpoint}/${id}`);

		return c.json(
			{
				data: parseResponse(inventoryCountSchema, {
					...row,
					occurredAt: row.occurredAt.toISOString(),
					items: payload.items,
				}),
			},
			201,
		);
	},
});

export const inventoryCountRoutes = [
	getCountsRoute,
	getCountRoute,
	createCountRoute,
];
