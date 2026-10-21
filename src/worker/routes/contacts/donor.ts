import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
	donorCreateSchema,
	donorListSchema,
	donorSchema,
	donorUpdateSchema,
} from "../../../schemas/api/donor";
import { dataListOf, dataOf, idParamsSchema } from "../../../schemas/api/common";
import { donor } from "../../../schemas/db/contacts";
import { app } from "../../app";
import { notFoundError, rejectEmptyUpdate } from "../../api/errors";
import { parseResponse } from "../../api/response";
import { defineWorkerRoute } from "../../api/route";

const Donor = app.openAPIRegistry.register("Donor", donorSchema);
const DonorList = app.openAPIRegistry.register("DonorList", donorListSchema);

const endpoint = "/api/v1/donors";

const getDonorsRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: endpoint,
		responses: {
			200: {
				description: "Donor list",
				content: { "application/json": { schema: dataListOf(DonorList) } },
			},
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);

		const rows = await db
			.select({
				id: donor.id,
				name: donor.name,
				phone: donor.phone,
				email: donor.email,
				cidade: donor.cidade,
				uf: donor.uf,
			})
			.from(donor)
			.all();

		return c.json({ data: parseResponse(donorListSchema.array(), rows) }, 200);
	},
});

const getDonorRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Donor",
				content: { "application/json": { schema: dataOf(Donor) } },
			},
			404: { description: "Donor not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [row] = await db.select().from(donor).where(eq(donor.id, id)).limit(1);

		if (!row) throw notFoundError("Donor not found.");

		return c.json({ data: parseResponse(donorSchema, row) }, 200);
	},
});

const createDonorRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: endpoint,
		request: {
			body: {
				content: { "application/json": { schema: donorCreateSchema } },
			},
		},
		responses: {
			201: {
				description: "Donor created",
				content: { "application/json": { schema: dataOf(Donor) } },
			},
			400: { description: "Invalid input" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const payload = c.req.valid("json");

		const [row] = await db
			.insert(donor)
			.values({ id: crypto.randomUUID(), ...payload })
			.returning();

		c.header("Location", `${endpoint}/${row.id}`);

		return c.json({ data: parseResponse(donorSchema, row) }, 201);
	},
});

const updateDonorRoute = defineWorkerRoute({
	route: createRoute({
		method: "patch",
		path: `${endpoint}/{id}`,
		request: {
			params: idParamsSchema,
			body: {
				content: { "application/json": { schema: donorUpdateSchema } },
			},
		},
		responses: {
			200: {
				description: "Donor updated",
				content: { "application/json": { schema: dataOf(Donor) } },
			},
			400: { description: "Invalid input" },
			404: { description: "Donor not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");
		const payload = c.req.valid("json");

		rejectEmptyUpdate(payload);

		const [existing] = await db
			.select({ id: donor.id })
			.from(donor)
			.where(eq(donor.id, id))
			.limit(1);

		if (!existing) throw notFoundError("Donor not found.");

		const [row] = await db
			.update(donor)
			.set(payload)
			.where(eq(donor.id, id))
			.returning();

		return c.json({ data: parseResponse(donorSchema, row) }, 200);
	},
});

const deleteDonorRoute = defineWorkerRoute({
	route: createRoute({
		method: "delete",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			204: { description: "Donor deleted" },
			404: { description: "Donor not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [removed] = await db
			.delete(donor)
			.where(eq(donor.id, id))
			.returning({ id: donor.id });

		if (!removed) throw notFoundError("Donor not found.");

		return c.body(null, 204);
	},
});

export const donorRoutes = [
	getDonorsRoute,
	getDonorRoute,
	createDonorRoute,
	updateDonorRoute,
	deleteDonorRoute,
];
