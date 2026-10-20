import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
	categoryCreateSchema,
	categorySchema,
	categoryUpdateSchema,
} from "../../../schemas/api/category";
import { dataListOf, dataOf, idParamsSchema } from "../../../schemas/api/common";
import { category } from "../../../schemas/db/inventory";
import { app } from "../../app";
import { notFoundError, rejectEmptyUpdate } from "../../api/errors";
import { parseResponse } from "../../api/response";
import { defineWorkerRoute } from "../../api/route";

const Category = app.openAPIRegistry.register(
	"ItemCategory",
	categorySchema,
);

const endpoint = "/api/v1/inventory/categories";

const getCategoriesRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: endpoint,
		responses: {
			200: {
				description: "Item category list",
				content: { "application/json": { schema: dataListOf(Category) } },
			},
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const rows = await db.select().from(category).all();

		return c.json({ data: parseResponse(categorySchema.array(), rows) }, 200);
	},
});

const getCategoryRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Item category",
				content: { "application/json": { schema: dataOf(Category) } },
			},
			404: { description: "Item category not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [row] = await db
			.select()
			.from(category)
			.where(eq(category.id, id))
			.limit(1);

		if (!row) throw notFoundError("Item category not found.");

		return c.json({ data: parseResponse(categorySchema, row) }, 200);
	},
});

const createCategoryRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: endpoint,
		request: {
			body: {
				content: {
					"application/json": { schema: categoryCreateSchema },
				},
			},
		},
		responses: {
			201: {
				description: "Item category created",
				content: { "application/json": { schema: dataOf(Category) } },
			},
			400: { description: "Invalid input" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const payload = c.req.valid("json");

		const [row] = await db
			.insert(category)
			.values({ id: crypto.randomUUID(), ...payload })
			.returning();

		c.header("Location", `${endpoint}/${row.id}`);

		return c.json({ data: parseResponse(categorySchema, row) }, 201);
	},
});

const updateCategoryRoute = defineWorkerRoute({
	route: createRoute({
		method: "patch",
		path: `${endpoint}/{id}`,
		request: {
			params: idParamsSchema,
			body: {
				content: {
					"application/json": { schema: categoryUpdateSchema },
				},
			},
		},
		responses: {
			200: {
				description: "Item category updated",
				content: { "application/json": { schema: dataOf(Category) } },
			},
			400: { description: "Invalid input" },
			404: { description: "Item category not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");
		const payload = c.req.valid("json");

		rejectEmptyUpdate(payload);

		const [existing] = await db
			.select({ id: category.id })
			.from(category)
			.where(eq(category.id, id))
			.limit(1);

		if (!existing) throw notFoundError("Item category not found.");

		const [row] = await db
			.update(category)
			.set(payload)
			.where(eq(category.id, id))
			.returning();

		return c.json({ data: parseResponse(categorySchema, row) }, 200);
	},
});

const deleteCategoryRoute = defineWorkerRoute({
	route: createRoute({
		method: "delete",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			204: { description: "Item category deleted" },
			404: { description: "Item category not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [removed] = await db
			.delete(category)
			.where(eq(category.id, id))
			.returning({ id: category.id });

		if (!removed) throw notFoundError("Item category not found.");

		return c.body(null, 204);
	},
});

export const categoryRoutes = [
	getCategoriesRoute,
	getCategoryRoute,
	createCategoryRoute,
	updateCategoryRoute,
	deleteCategoryRoute,
];
