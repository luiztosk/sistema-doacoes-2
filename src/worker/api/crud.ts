import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { ApiError } from "./errors";
import type { AppEnvironment } from "./types";
import { readJsonObject } from "./validation";

export type CrudOperations<TRecord, TCreate, TUpdate> = {
	list: (db: DrizzleD1Database, organizationId: string) => Promise<TRecord[]>;
	find: (
		db: DrizzleD1Database,
		organizationId: string,
		id: string,
	) => Promise<TRecord | undefined>;
	create: (
		db: DrizzleD1Database,
		organizationId: string,
		payload: TCreate,
	) => Promise<TRecord>;
	update: (
		db: DrizzleD1Database,
		organizationId: string,
		id: string,
		payload: TUpdate,
	) => Promise<TRecord | undefined>;
	remove: (
		db: DrizzleD1Database,
		organizationId: string,
		id: string,
	) => Promise<boolean>;
};

export type CrudResource<TRecord extends { id: string }, TCreate, TUpdate> = {
	path: string;
	name: string;
	parseCreate: (body: Record<string, unknown>) => TCreate;
	parseUpdate: (body: Record<string, unknown>) => TUpdate;
	validateCreate?: (payload: TCreate) => void;
	validateUpdate?: (existing: TRecord, payload: TUpdate) => void;
	operations: CrudOperations<TRecord, TCreate, TUpdate>;
};

export function registerCrudResource<
	TRecord extends { id: string },
	TCreate,
	TUpdate,
>(
	app: Hono<AppEnvironment>,
	resource: CrudResource<TRecord, TCreate, TUpdate>,
) {
	const basePath = `/${resource.path}`;

	app.get(basePath, async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const data = await resource.operations.list(db, c.get("organizationId"));
		return c.json({ data });
	});

	app.get(`${basePath}/:id`, async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const data = await resource.operations.find(
			db,
			c.get("organizationId"),
			c.req.param("id"),
		);

		if (!data) {
			throw new ApiError(
				404,
				"NOT_FOUND",
				`${resource.name} não encontrado.`,
			);
		}

		return c.json({ data });
	});

	app.post(basePath, async (c) => {
		const payload = resource.parseCreate(await readJsonObject(c));
		resource.validateCreate?.(payload);

		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const data = await resource.operations.create(
			db,
			c.get("organizationId"),
			payload,
		);
		c.header("Location", `${c.req.path}/${data.id}`);
		return c.json({ data }, 201);
	});

	app.patch(`${basePath}/:id`, async (c) => {
		const payload = resource.parseUpdate(await readJsonObject(c));
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const organizationId = c.get("organizationId");
		const id = c.req.param("id");
		const existing = await resource.operations.find(db, organizationId, id);

		if (!existing) {
			throw new ApiError(
				404,
				"NOT_FOUND",
				`${resource.name} não encontrado.`,
			);
		}

		resource.validateUpdate?.(existing, payload);
		const data = await resource.operations.update(
			db,
			organizationId,
			id,
			payload,
		);
		return c.json({ data });
	});

	app.delete(`${basePath}/:id`, async (c) => {
		const db = drizzle(c.env.prod_sistema_doacoes_2);
		const removed = await resource.operations.remove(
			db,
			c.get("organizationId"),
			c.req.param("id"),
		);

		if (!removed) {
			throw new ApiError(
				404,
				"NOT_FOUND",
				`${resource.name} não encontrado.`,
			);
		}

		return c.body(null, 204);
	});
}
