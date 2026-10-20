import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
	beneficiaryCreateSchema,
	beneficiaryListSchema,
	beneficiarySchema,
	beneficiaryUpdateSchema,
} from "../../../schemas/api/beneficiary";
import { dataListOf, dataOf, idParamsSchema } from "../../../schemas/api/common";
import { beneficiary } from "../../../schemas/db/contacts";
import { app } from "../../app";
import { notFoundError, rejectEmptyUpdate } from "../../api/errors";
import { defineWorkerRoute } from "../../api/route";
import { parseResponse } from "../../api/response";

const Beneficiary = app.openAPIRegistry.register(
	"Beneficiary",
	beneficiarySchema,
);
const BeneficiaryList = app.openAPIRegistry.register(
	"BeneficiaryList",
	beneficiaryListSchema,
);

const endpoint = "/api/v1/beneficiaries";

const getBeneficiariesRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: endpoint,
		responses: {
			200: {
				description: "Beneficiary list",
				content: { "application/json": { schema: dataListOf(BeneficiaryList) } },
			},
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);

		const rows = await db
			.select({
				id: beneficiary.id,
				name: beneficiary.name,
				phone: beneficiary.phone,
				email: beneficiary.email,
				cidade: beneficiary.cidade,
				uf: beneficiary.uf,
				renda: beneficiary.renda,
				tipoImovel: beneficiary.tipoImovel,
				cestaBasica: beneficiary.cestaBasica,
			})
			.from(beneficiary)
			.all();

		return c.json({ data: parseResponse(beneficiaryListSchema.array(), rows) }, 200);
	},
});

const getBeneficiaryRoute = defineWorkerRoute({
	route: createRoute({
		method: "get",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			200: {
				description: "Beneficiary",
				content: { "application/json": { schema: dataOf(Beneficiary) } },
			},
			404: { description: "Beneficiary not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [row] = await db
			.select()
			.from(beneficiary)
			.where(eq(beneficiary.id, id))
			.limit(1);

		if (!row) throw notFoundError("Beneficiary not found.");

		return c.json({ data: parseResponse(beneficiarySchema, row) }, 200);
	},
});

const createBeneficiaryRoute = defineWorkerRoute({
	route: createRoute({
		method: "post",
		path: endpoint,
		request: {
			body: {
				content: {
					"application/json": { schema: beneficiaryCreateSchema },
				},
			},
		},
		responses: {
			201: {
				description: "Beneficiary created",
				content: { "application/json": { schema: dataOf(Beneficiary) } },
			},
			400: { description: "Invalid input" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const payload = c.req.valid("json");

		const [row] = await db
			.insert(beneficiary)
			.values({ id: crypto.randomUUID(), ...payload })
			.returning();

		c.header("Location", `${endpoint}/${row.id}`);

		return c.json({ data: parseResponse(beneficiarySchema, row) }, 201);
	},
});

const updateBeneficiaryRoute = defineWorkerRoute({
	route: createRoute({
		method: "patch",
		path: `${endpoint}/{id}`,
		request: {
			params: idParamsSchema,
			body: {
				content: {
					"application/json": { schema: beneficiaryUpdateSchema },
				},
			},
		},
		responses: {
			200: {
				description: "Beneficiary updated",
				content: { "application/json": { schema: dataOf(Beneficiary) } },
			},
			400: { description: "Invalid input" },
			404: { description: "Beneficiary not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");
		const payload = c.req.valid("json");

		rejectEmptyUpdate(payload);

		const [existing] = await db
			.select({ id: beneficiary.id })
			.from(beneficiary)
			.where(eq(beneficiary.id, id))
			.limit(1);

		if (!existing) throw notFoundError("Beneficiary not found.");

		const [row] = await db
			.update(beneficiary)
			.set(payload)
			.where(eq(beneficiary.id, id))
			.returning();

		return c.json({ data: parseResponse(beneficiarySchema, row) }, 200);
	},
});

const deleteBeneficiaryRoute = defineWorkerRoute({
	route: createRoute({
		method: "delete",
		path: `${endpoint}/{id}`,
		request: { params: idParamsSchema },
		responses: {
			204: { description: "Beneficiary deleted" },
			404: { description: "Beneficiary not found" },
		},
	}),
	handler: async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const id = c.req.param("id");

		const [removed] = await db
			.delete(beneficiary)
			.where(eq(beneficiary.id, id))
			.returning({ id: beneficiary.id });

		if (!removed) throw notFoundError("Beneficiary not found.");

		return c.body(null, 204);
	},
});

export const beneficiaryRoutes = [
	getBeneficiariesRoute,
	getBeneficiaryRoute,
	createBeneficiaryRoute,
	updateBeneficiaryRoute,
	deleteBeneficiaryRoute,
];
