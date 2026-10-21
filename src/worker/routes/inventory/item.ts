import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { dataListOf, dataOf, idParamsSchema } from "../../../schemas/api/common";
import {
	itemCreateSchema,
	itemSchema,
	itemUpdateSchema,
} from "../../../schemas/api/item";
import { item } from "../../../schemas/db/inventory";
import { app } from "../../app";
import { notFoundError, rejectEmptyUpdate } from "../../api/errors";
import { errorResponse, parseResponse } from "../../api/response";
import { defineWorkerRoute } from "../../api/route";

const Item = app.openAPIRegistry.register("InventoryItem", itemSchema);

const endpoint = "/api/v1/inventory/items";

const getItemsRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: endpoint,
		responses: {
			200: {
				description: "Inventory item list",
				content: { "application/json": { schema: dataListOf(Item) } },
			},
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const rows = await db.select().from(item).all();

		return c.json({ data: parseResponse(itemSchema.array(), rows) }, 200);
	},
});

const getItemRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Inventory item",
				content: { "application/json": { schema: dataOf(Item) } },
			},
			404: errorResponse("Inventory item not found"),
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [row] = await db.select().from(item).where(eq(item.id, id)).limit(1);

		if (!row) throw notFoundError("Inventory item not found.");

		return c.json({ data: parseResponse(itemSchema, row) }, 200);
	},
});

const createItemRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: endpoint,
		request: {
			body: {
				content: { "application/json": { schema: itemCreateSchema } },
			},
		},
		responses: {
			201: {
				description: "Inventory item created",
				content: { "application/json": { schema: dataOf(Item) } },
			},
			400: errorResponse("Invalid input"),
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const payload = c.req.valid("json");

		const [row] = await db
			.insert(item)
			.values({ id: crypto.randomUUID(), ...payload })
			.returning();

		c.header("Location", `${endpoint}/${row.id}`);

		return c.json({ data: parseResponse(itemSchema, row) }, 201);
	},
});

const updateItemRoute = defineWorkerRoute({
	route: createRoute({
		method: "patch",
		path: `${endpoint}/{id}`,
		request: {
			params: idParamsSchema,
			body: {
				content: { "application/json": { schema: itemUpdateSchema } },
			},
		},
		responses: {
			200: {
				description: "Inventory item updated",
				content: { "application/json": { schema: dataOf(Item) } },
			},
			400: errorResponse("Invalid input"),
			404: errorResponse("Inventory item not found"),
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");
		const payload = c.req.valid("json");

		rejectEmptyUpdate(payload);

		const [existing] = await db
			.select({ id: item.id })
			.from(item)
			.where(eq(item.id, id))
			.limit(1);

		if (!existing) throw notFoundError("Inventory item not found.");

		const [row] = await db
			.update(item)
			.set(payload)
			.where(eq(item.id, id))
			.returning();

		return c.json({ data: parseResponse(itemSchema, row) }, 200);
	},
});

const deleteItemRoute = defineWorkerRoute({
	route: createRoute({
		method: "delete",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			204: { description: "Inventory item deleted" },
			404: errorResponse("Inventory item not found"),
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [removed] = await db
			.delete(item)
			.where(eq(item.id, id))
			.returning({ id: item.id });

		if (!removed) throw notFoundError("Inventory item not found.");

		return c.body(null, 204);
	},
});

export const itemRoutes = [
	getItemsRoute,
	getItemRoute,
	createItemRoute,
	updateItemRoute,
	deleteItemRoute,
];
