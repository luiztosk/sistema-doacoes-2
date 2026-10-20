import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { dataListOf } from "../../../schemas/api/common";
import { stockSchema } from "../../../schemas/api/stock";
import { category, item } from "../../../schemas/db/inventory";
import { app } from "../../app";
import { parseResponse } from "../../api/response";
import { defineWorkerRoute } from "../../api/route";

const Stock = app.openAPIRegistry.register("Stock", stockSchema);

const getStockRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: "/api/v1/stock",
		responses: {
			200: {
				description: "Stock balance per item",
				content: { "application/json": { schema: dataListOf(Stock) } },
			},
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);

		const rows = await db
			.select({
				itemId: item.id,
				name: item.name,
				categoryId: item.categoryId,
				categoryName: category.name,
				unit: item.unit,
				onHand: item.onHand,
				reserved: item.reserved,
				available: item.available,
			})
			.from(item)
			.innerJoin(category, eq(item.categoryId, category.id));

		return c.json({ data: parseResponse(stockSchema.array(), rows) }, 200);
	},
});

export const stockRoutes = [getStockRoute];
