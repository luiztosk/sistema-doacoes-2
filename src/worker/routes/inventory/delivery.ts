import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { dataListOf, dataOf, idParamsSchema } from "../../../schemas/api/common";
import {
	deliveryCreateSchema,
	deliveryListSchema,
	deliverySchema,
	deliveryUpdateSchema,
} from "../../../schemas/api/delivery";
import { delivery } from "../../../schemas/db/inventory";
import { app } from "../../app";
import { apiError, notFoundError, rejectEmptyUpdate } from "../../api/errors";
import { parseResponse } from "../../api/response";
import { defineWorkerRoute } from "../../api/route";
import {
	documentEntries,
	documentItems,
	stockBatch,
	toEntries,
} from "../../api/stock";

const Delivery = app.openAPIRegistry.register("Delivery", deliverySchema);
const DeliveryList = app.openAPIRegistry.register(
	"DeliveryList",
	deliveryListSchema,
);

const endpoint = "/api/v1/deliveries";

async function readDelivery(db: ReturnType<typeof drizzle>, id: string) {
	const [row] = await db
		.select()
		.from(delivery)
		.where(eq(delivery.id, id))
		.limit(1);

	if (!row) throw notFoundError("Delivery not found.");

	const items = await documentItems(db, id, "RESERVE");

	return {
		...row,
		occurredAt: row.occurredAt.toISOString(),
		items,
	};
}

const getDeliveriesRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: endpoint,
		responses: {
			200: {
				description: "Delivery list",
				content: { "application/json": { schema: dataListOf(DeliveryList) } },
			},
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const rows = await db.select().from(delivery).all();

		const data = rows.map((row) => ({
			...row,
			occurredAt: row.occurredAt.toISOString(),
		}));

		return c.json({ data: parseResponse(deliveryListSchema.array(), data) }, 200);
	},
});

const getDeliveryRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Delivery",
				content: { "application/json": { schema: dataOf(Delivery) } },
			},
			404: { description: "Delivery not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const row = await readDelivery(db, c.req.param("id"));

		return c.json({ data: parseResponse(deliverySchema, row) }, 200);
	},
});

const createDeliveryRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: endpoint,
		request: {
			body: {
				content: { "application/json": { schema: deliveryCreateSchema } },
			},
		},
		responses: {
			201: {
				description: "Delivery created",
				content: { "application/json": { schema: dataOf(Delivery) } },
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
				"An item cannot appear twice in the same delivery.",
			);
		}

		const id = crypto.randomUUID();
		const occurredAt = new Date(payload.occurredAt);

		const entries = toEntries(
			payload.items.map((entry) => ({
				itemId: entry.itemId,
				kind: "RESERVE" as const,
				onHandDelta: 0,
				reservedDelta: entry.quantity,
			})),
			id,
			occurredAt,
		);

		await db.batch(
			stockBatch(
				db,
				entries,
				[
				db
					.insert(delivery)
					.values({
						id,
						beneficiaryId: payload.beneficiaryId,
						occurredAt,
						status: "OPEN",
						note: payload.note ?? null,
					}),
				],
			),
		);

		const row = await readDelivery(db, id);

		c.header("Location", `${endpoint}/${id}`);

		return c.json({ data: parseResponse(deliverySchema, row) }, 201);
	},
});

const updateDeliveryRoute = defineWorkerRoute({
	route: createRoute({
		method: "patch",
		path: `${endpoint}/{id}`,
		request: {
			params: idParamsSchema,
			body: {
				content: { "application/json": { schema: deliveryUpdateSchema } },
			},
		},
		responses: {
			200: {
				description: "Delivery updated",
				content: { "application/json": { schema: dataOf(Delivery) } },
			},
			400: { description: "Invalid input" },
			404: { description: "Delivery not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");
		const payload = c.req.valid("json");

		rejectEmptyUpdate(payload);

		const [existing] = await db
			.select({ id: delivery.id })
			.from(delivery)
			.where(eq(delivery.id, id))
			.limit(1);

		if (!existing) throw notFoundError("Delivery not found.");

		const [row] = await db
			.update(delivery)
			.set({
				...payload,
				occurredAt: payload.occurredAt
					? new Date(payload.occurredAt)
					: undefined,
			})
			.where(eq(delivery.id, id))
			.returning();

		const detail = await readDelivery(db, row.id);

		return c.json({ data: parseResponse(deliverySchema, detail) }, 200);
	},
});

const completeDeliveryRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: `${endpoint}/{id}/complete`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Delivery completed",
				content: { "application/json": { schema: dataOf(Delivery) } },
			},
			400: { description: "Invalid transition" },
			404: { description: "Delivery not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [existing] = await db
			.select()
			.from(delivery)
			.where(eq(delivery.id, id))
			.limit(1);

		if (!existing) throw notFoundError("Delivery not found.");

		if (existing.status !== "OPEN") {
			throw apiError(
				400,
				"INVALID_TRANSITION",
				`Cannot complete a delivery in status ${existing.status}.`,
			);
		}

		const reserved = await documentEntries(db, id, "RESERVE");

		const entries = toEntries(
			reserved.map((entry) => ({
				itemId: entry.item_id,
				kind: "ISSUE" as const,
				onHandDelta: -entry.reserved_delta,
				reservedDelta: -entry.reserved_delta,
			})),
			id,
			new Date(),
		);

		await db.batch(
			stockBatch(
				db,
				entries,
				[
				db
					.update(delivery)
					.set({ status: "COMPLETED" })
					.where(eq(delivery.id, id)),
				],
			),
		);

		const row = await readDelivery(db, id);

		return c.json({ data: parseResponse(deliverySchema, row) }, 200);
	},
});

const cancelDeliveryRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: `${endpoint}/{id}/cancel`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Delivery cancelled",
				content: { "application/json": { schema: dataOf(Delivery) } },
			},
			400: { description: "Invalid transition" },
			404: { description: "Delivery not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [existing] = await db
			.select()
			.from(delivery)
			.where(eq(delivery.id, id))
			.limit(1);

		if (!existing) throw notFoundError("Delivery not found.");

		if (existing.status !== "OPEN") {
			throw apiError(
				400,
				"INVALID_TRANSITION",
				`Cannot cancel a delivery in status ${existing.status}.`,
			);
		}

		const reserved = await documentEntries(db, id, "RESERVE");

		const entries = toEntries(
			reserved.map((entry) => ({
				itemId: entry.item_id,
				kind: "RELEASE" as const,
				onHandDelta: 0,
				reservedDelta: -entry.reserved_delta,
			})),
			id,
			new Date(),
		);

		await db.batch(
			stockBatch(
				db,
				entries,
				[
				db
					.update(delivery)
					.set({ status: "CANCELLED" })
					.where(eq(delivery.id, id)),
				],
			),
		);

		const row = await readDelivery(db, id);

		return c.json({ data: parseResponse(deliverySchema, row) }, 200);
	},
});

export const deliveryRoutes = [
	getDeliveriesRoute,
	getDeliveryRoute,
	createDeliveryRoute,
	updateDeliveryRoute,
	completeDeliveryRoute,
	cancelDeliveryRoute,
];
