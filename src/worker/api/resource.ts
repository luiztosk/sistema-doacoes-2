import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import type { AnySQLiteColumn, AnySQLiteTable } from "drizzle-orm/sqlite-core";
import type { Context, Hono } from "hono";
import type { z } from "zod";
import { apiError, parseBody, readJsonObject } from "./errors";

export type ApiBindings = { Bindings: Env };

type TableWithId = AnySQLiteTable & { id: AnySQLiteColumn };

export type ResourcePayload<TTable extends TableWithId> = Omit<
	InferInsertModel<TTable>,
	"id"
>;

type ResourceDescriptor<TTable extends TableWithId> = {
	table: TTable;
	path: string;
	name: string;
	schemas: {
		insert: z.ZodType<ResourcePayload<TTable>>;
		update?: z.ZodType<Partial<ResourcePayload<TTable>>>;
	};
	validate?: (
		db: DrizzleD1Database,
		payload: Partial<ResourcePayload<TTable>>,
		existing?: InferSelectModel<TTable>,
	) => void | Promise<void>;
	create?: boolean;
	detail?: (
		db: DrizzleD1Database,
		record: InferSelectModel<TTable>,
	) => Promise<Record<string, unknown>> | Record<string, unknown>;
};

export const dbOf = (c: Context<ApiBindings>) =>
	drizzle(c.env.prod_sistema_doacoes_2);

export const rawOf = (c: Context<ApiBindings>) => c.env.prod_sistema_doacoes_2;

export async function findById<TTable extends TableWithId>(
	db: DrizzleD1Database,
	table: TTable,
	id: string,
	name: string,
) {
	const [record] = await db
		.select()
		.from(table)
		.where(eq(table.id, id))
		.limit(1);

	if (!record) {
		throw apiError(404, "NOT_FOUND", `${name} not found.`);
	}

	return record;
}

export function registerResource<TTable extends TableWithId>(
	app: Hono<ApiBindings>,
	resource: ResourceDescriptor<TTable>,
) {
	const {
		table,
		path,
		name,
		schemas,
		validate,
		create = true,
		detail,
	} = resource;
	const base = `/${path}`;
	const updateSchema = schemas.update ?? schemas.insert;

	function firstOrThrow(records: unknown, action: string) {
		const [record] = Array.isArray(records) ? records : [];
		if (!record) {
			throw new Error(`The database did not return the ${name} ${action}.`);
		}
		return record as Record<string, unknown>;
	}

	app.get(base, async (c) => {
		const data = await dbOf(c).select().from(table);
		return c.json({ data });
	});

	app.get(`${base}/:id`, async (c) => {
		const db = dbOf(c);
		const record = await findById(db, table, c.req.param("id"), name);
		const data = detail ? await detail(db, record) : record;

		return c.json({ data });
	});

	if (create) {
		app.post(base, async (c) => {
			const db = dbOf(c);
			const payload = parseBody(
				await readJsonObject(c),
				schemas.insert,
				"create",
			);

			await validate?.(db, payload);

			const data = firstOrThrow(
				await db
					.insert(table)
					.values({
						id: crypto.randomUUID(),
						...payload,
					} as InferInsertModel<TTable>)
					.returning(),
				"created",
			);

			c.header("Location", `${c.req.path}/${data.id}`);
			return c.json({ data }, 201);
		});
	}

	app.patch(`${base}/:id`, async (c) => {
		const db = dbOf(c);
		const id = c.req.param("id");
		const existing = await findById(db, table, id, name);
		const payload = parseBody(await readJsonObject(c), updateSchema, "update");

		await validate?.(db, payload, existing);

		const data = firstOrThrow(
			await db
				.update(table)
				.set(payload as Partial<InferInsertModel<TTable>>)
				.where(eq(table.id, id))
				.returning(),
			"updated",
		);

		return c.json({ data });
	});

	app.delete(`${base}/:id`, async (c) => {
		const [removed] = await dbOf(c)
			.delete(table)
			.where(eq(table.id, c.req.param("id")))
			.returning({ id: table.id });

		if (!removed) {
			throw apiError(404, "NOT_FOUND", `${name} not found.`);
		}

		return c.body(null, 204);
	});
}
