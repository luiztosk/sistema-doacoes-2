import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { dataListOf, dataOf, idParamsSchema } from "../../../schemas/api/common";
import {
	donationCreateSchema,
	donationListSchema,
	donationSchema,
	donationUpdateSchema,
} from "../../../schemas/api/donation";
import { donation } from "../../../schemas/db/inventory";
import { app } from "../../app";
import { apiError, notFoundError, rejectEmptyUpdate } from "../../api/errors";
import { errorResponse, parseResponse } from "../../api/response";
import { defineWorkerRoute } from "../../api/route";
import {
	documentEntries,
	documentItems,
	reverseEntries,
	stockBatch,
	toEntries,
} from "../../api/stock";

const Donation = app.openAPIRegistry.register("Donation", donationSchema);
const DonationList = app.openAPIRegistry.register(
	"DonationList",
	donationListSchema,
);

const endpoint = "/api/v1/donations";

async function readDonation(
	db: ReturnType<typeof drizzle>,
	id: string,
) {
	const [row] = await db
		.select()
		.from(donation)
		.where(eq(donation.id, id))
		.limit(1);

	if (!row) throw notFoundError("Donation not found.");

	const items = await documentItems(db, id, "RECEIVE");

	return {
		...row,
		occurredAt: row.occurredAt.toISOString(),
		items,
	};
}

const getDonationsRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: endpoint,
		responses: {
			200: {
				description: "Donation list",
				content: { "application/json": { schema: dataListOf(DonationList) } },
			},
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const rows = await db.select().from(donation).all();

		const data = rows.map((row) => ({
			...row,
			occurredAt: row.occurredAt.toISOString(),
		}));

		return c.json({ data: parseResponse(donationListSchema.array(), data) }, 200);
	},
});

const getDonationRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Donation",
				content: { "application/json": { schema: dataOf(Donation) } },
			},
			404: errorResponse("Donation not found"),
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const row = await readDonation(db, c.req.param("id"));

		return c.json({ data: parseResponse(donationSchema, row) }, 200);
	},
});

const createDonationRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: endpoint,
		request: {
			body: {
				content: { "application/json": { schema: donationCreateSchema } },
			},
		},
		responses: {
			201: {
				description: "Donation created",
				content: { "application/json": { schema: dataOf(Donation) } },
			},
			400: errorResponse("Invalid input"),
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
				"An item cannot appear twice in the same donation.",
			);
		}

		const id = crypto.randomUUID();
		const occurredAt = new Date(payload.occurredAt);

		const entries = toEntries(
			payload.items.map((entry) => ({
				itemId: entry.itemId,
				kind: "RECEIVE" as const,
				onHandDelta: entry.quantity,
				reservedDelta: 0,
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
					.insert(donation)
					.values({
						id,
						donorId: payload.donorId,
						occurredAt,
						status: "RECEIVED",
						note: payload.note ?? null,
					}),
				],
			),
		);

		const row = await readDonation(db, id);

		c.header("Location", `${endpoint}/${id}`);

		return c.json({ data: parseResponse(donationSchema, row) }, 201);
	},
});

const updateDonationRoute = defineWorkerRoute({
	route: createRoute({
		method: "patch",
		path: `${endpoint}/{id}`,
		request: {
			params: idParamsSchema,
			body: {
				content: { "application/json": { schema: donationUpdateSchema } },
			},
		},
		responses: {
			200: {
				description: "Donation updated",
				content: { "application/json": { schema: dataOf(Donation) } },
			},
			400: errorResponse("Invalid input"),
			404: errorResponse("Donation not found"),
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");
		const payload = c.req.valid("json");

		rejectEmptyUpdate(payload);

		const [existing] = await db
			.select({ id: donation.id })
			.from(donation)
			.where(eq(donation.id, id))
			.limit(1);

		if (!existing) throw notFoundError("Donation not found.");

		const [row] = await db
			.update(donation)
			.set({
				...payload,
				occurredAt: payload.occurredAt
					? new Date(payload.occurredAt)
					: undefined,
			})
			.where(eq(donation.id, id))
			.returning();

		const detail = await readDonation(db, row.id);

		return c.json({ data: parseResponse(donationSchema, detail) }, 200);
	},
});

const voidDonationRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: `${endpoint}/{id}/void`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Donation voided",
				content: { "application/json": { schema: dataOf(Donation) } },
			},
			400: errorResponse("Invalid transition"),
			404: errorResponse("Donation not found"),
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [existing] = await db
			.select()
			.from(donation)
			.where(eq(donation.id, id))
			.limit(1);

		if (!existing) throw notFoundError("Donation not found.");

		if (existing.status !== "RECEIVED") {
			throw apiError(
				400,
				"INVALID_TRANSITION",
				`Cannot void a donation in status ${existing.status}.`,
			);
		}

		const received = await documentEntries(db, id, "RECEIVE");
		const reversed = reverseEntries(received, new Date());

		await db.batch(
			stockBatch(
				db,
				reversed,
				[
				db
					.update(donation)
					.set({ status: "VOID" })
					.where(eq(donation.id, id)),
				],
			),
		);

		const row = await readDonation(db, id);

		return c.json({ data: parseResponse(donationSchema, row) }, 200);
	},
});

export const donationRoutes = [
	getDonationsRoute,
	getDonationRoute,
	createDonationRoute,
	updateDonationRoute,
	voidDonationRoute,
];
