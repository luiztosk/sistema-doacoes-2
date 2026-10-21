import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { dataListOf, dataOf, idParamsSchema } from "../../../schemas/api/common";
import {
	inventoryAdjustmentCreateSchema,
	inventoryAdjustmentListSchema,
	inventoryAdjustmentSchema,
} from "../../../schemas/api/inventory-adjustment";
import { inventoryAdjustment, item } from "../../../schemas/db/inventory";
import { app } from "../../app";
import { notFoundError } from "../../api/errors";
import { errorResponse, parseResponse } from "../../api/response";
import { defineWorkerRoute } from "../../api/route";
import { stockBatch, toEntries } from "../../api/stock";

const Adjustment = app.openAPIRegistry.register(
	"InventoryAdjustment",
	inventoryAdjustmentSchema,
);
const AdjustmentList = app.openAPIRegistry.register(
	"InventoryAdjustmentList",
	inventoryAdjustmentListSchema,
);

const endpoint = "/api/v1/inventory-adjustments";

const getAdjustmentsRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: endpoint,
		responses: {
			200: {
				description: "Inventory adjustment list",
				content: { "application/json": { schema: dataListOf(AdjustmentList) } },
			},
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);

		const rows = await db
			.select({
				id: inventoryAdjustment.id,
				itemId: inventoryAdjustment.itemId,
				delta: inventoryAdjustment.delta,
				reason: inventoryAdjustment.reason,
				occurredAt: inventoryAdjustment.occurredAt,
			})
			.from(inventoryAdjustment)
			.all();

		const data = rows.map((row) => ({
			...row,
			occurredAt: row.occurredAt.toISOString(),
		}));

		return c.json(
			{ data: parseResponse(inventoryAdjustmentListSchema.array(), data) },
			200,
		);
	},
});

const getAdjustmentRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Inventory adjustment",
				content: { "application/json": { schema: dataOf(Adjustment) } },
			},
			404: errorResponse("Inventory adjustment not found"),
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [row] = await db
			.select({
				id: inventoryAdjustment.id,
				itemId: inventoryAdjustment.itemId,
				itemName: item.name,
				delta: inventoryAdjustment.delta,
				reason: inventoryAdjustment.reason,
				occurredAt: inventoryAdjustment.occurredAt,
			})
			.from(inventoryAdjustment)
			.innerJoin(item, eq(inventoryAdjustment.itemId, item.id))
			.where(eq(inventoryAdjustment.id, id))
			.limit(1);

		if (!row) throw notFoundError("Inventory adjustment not found.");

		return c.json(
			{
				data: parseResponse(inventoryAdjustmentSchema, {
					...row,
					occurredAt: row.occurredAt.toISOString(),
				}),
			},
			200,
		);
	},
});

const createAdjustmentRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: endpoint,
		request: {
			body: {
				content: {
					"application/json": { schema: inventoryAdjustmentCreateSchema },
				},
			},
		},
		responses: {
			201: {
				description: "Inventory adjustment created",
				content: { "application/json": { schema: dataOf(Adjustment) } },
			},
			400: errorResponse("Invalid input"),
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const payload = c.req.valid("json");

		const id = crypto.randomUUID();
		const occurredAt = new Date(payload.occurredAt);

		const entries = toEntries(
			[
				{
					itemId: payload.itemId,
					kind: "ADJUST" as const,
					onHandDelta: payload.delta,
					reservedDelta: 0,
				},
			],
			id,
			occurredAt,
		);

		await db.batch(
			stockBatch(
				db,
				entries,
				[
					db.insert(inventoryAdjustment).values({
						id,
						itemId: payload.itemId,
						delta: payload.delta,
						reason: payload.reason,
						occurredAt,
					}),
				],
			),
		);

		const [row] = await db
			.select({
				id: inventoryAdjustment.id,
				itemId: inventoryAdjustment.itemId,
				itemName: item.name,
				delta: inventoryAdjustment.delta,
				reason: inventoryAdjustment.reason,
				occurredAt: inventoryAdjustment.occurredAt,
			})
			.from(inventoryAdjustment)
			.innerJoin(item, eq(inventoryAdjustment.itemId, item.id))
			.where(eq(inventoryAdjustment.id, id))
			.limit(1);

		c.header("Location", `${endpoint}/${id}`);

		return c.json(
			{
				data: parseResponse(inventoryAdjustmentSchema, {
					...row,
					occurredAt: row.occurredAt.toISOString(),
				}),
			},
			201,
		);
	},
});

export const inventoryAdjustmentRoutes = [
	getAdjustmentsRoute,
	getAdjustmentRoute,
	createAdjustmentRoute,
];
