import { createRoute } from "@hono/zod-openapi";
import { and, asc, count, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { SQL } from "drizzle-orm";
import { dataOf } from "../../../schemas/api/common";
import {
	ledgerListQuerySchema,
	ledgerPageSchema,
} from "../../../schemas/api/ledger";
import { item, ledger } from "../../../schemas/db/inventory";
import { app } from "../../app";
import { parseResponse } from "../../api/response";
import { defineWorkerRoute } from "../../api/route";

const LedgerPage = app.openAPIRegistry.register("LedgerPage", ledgerPageSchema);

const getLedgerRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: "/api/v1/ledger",
		request: { query: ledgerListQuerySchema },
		responses: {
			200: {
				description: "Ledger history, paginated on the server",
				content: { "application/json": { schema: dataOf(LedgerPage) } },
			},
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const query = c.req.valid("query");

		const filters: SQL[] = [];

		if (query.itemId) filters.push(eq(ledger.itemId, query.itemId));
		if (query.kind) filters.push(eq(ledger.kind, query.kind));
		if (query.refId) filters.push(eq(ledger.refId, query.refId));
		if (query.from)
			filters.push(gte(ledger.occurredAt, new Date(query.from)));
		if (query.to) filters.push(lte(ledger.occurredAt, new Date(query.to)));

		const where = filters.length > 0 ? and(...filters) : undefined;

		const [total] = await db
			.select({ value: count() })
			.from(ledger)
			.where(where);

		const order = query.sort === "occurredAt" ? asc(ledger.occurredAt) : asc(ledger.seq);

		const rows = await db
			.select({
				id: ledger.id,
				seq: ledger.seq,
				itemId: ledger.itemId,
				itemName: item.name,
				kind: ledger.kind,
				onHandDelta: ledger.onHandDelta,
				reservedDelta: ledger.reservedDelta,
				countedQuantity: ledger.countedQuantity,
				refId: ledger.refId,
				occurredAt: ledger.occurredAt,
			})
			.from(ledger)
			.innerJoin(item, eq(ledger.itemId, item.id))
			.where(where)
			.orderBy(order)
			.limit(query.pageSize)
			.offset(query.page * query.pageSize);

		const data = rows.map((row) => ({
			...row,
			occurredAt: row.occurredAt.toISOString(),
		}));

		return c.json(
			{
				data: parseResponse(ledgerPageSchema, {
					items: data,
					total: total?.value ?? 0,
					page: query.page,
					pageSize: query.pageSize,
				}),
			},
			200,
		);
	},
});

export const ledgerRoutes = [getLedgerRoute];
