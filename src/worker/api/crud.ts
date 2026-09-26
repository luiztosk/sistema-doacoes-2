import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import type { AnySQLiteColumn, AnySQLiteTable } from "drizzle-orm/sqlite-core";
import type { Context, Hono } from "hono";
import { ApiError } from "./errors";
import { parseBody, readJsonObject } from "./validation";

/** Every table in this schema is keyed by a text `id`. */
type TableWithId = AnySQLiteTable & { id: AnySQLiteColumn };

type ApiBindings = { Bindings: Env };

const dbOf = (c: Context<ApiBindings>) => drizzle(c.env.prod_sistema_doacoes_2);

/**
 * Registers the five CRUD routes for `table` under `/api/v1{path}`. The row and
 * payload types are inferred from the table, so the schema stays the single
 * source of truth.
 *
 * `validate` receives `existing` only on PATCH, which is how a resource tells a
 * create apart from an update.
 */
export function registerResource<TTable extends TableWithId>(
	app: Hono<ApiBindings>,
	table: TTable,
	path: string,
	name: string,
	validate?: (
		db: DrizzleD1Database,
		payload: InferInsertModel<TTable>,
		existing?: InferSelectModel<TTable>,
	) => void | Promise<void>,
) {
	const base = `/${path}`;

	async function findById(db: DrizzleD1Database, id: string) {
		const [record] = await db
			.select()
			.from(table)
			.where(eq(table.id, id))
			.limit(1);

		if (!record) {
			throw new ApiError(404, "NOT_FOUND", `${name} não encontrado.`);
		}

		return record;
	}

	function firstOrThrow(records: unknown, action: string) {
		// The D1 driver types `.returning()` as either a row array or a raw
		// response, so narrow before reading the first row.
		const [record] = Array.isArray(records) ? records : [];
		if (!record) {
			throw new Error(`O banco não retornou o ${name} ${action}.`);
		}
		return record as Record<string, unknown>;
	}

	app.get(base, async (c) => {
		const data = await dbOf(c).select().from(table);
		return c.json({ data });
	});

	app.get(`${base}/:id`, async (c) => {
		const data = await findById(dbOf(c), c.req.param("id"));
		return c.json({ data });
	});

	app.post(base, async (c) => {
		const db = dbOf(c);
		const payload = parseBody(
			await readJsonObject(c),
			table,
			"create",
		) as InferInsertModel<TTable>;

		await validate?.(db, payload);

		const data = firstOrThrow(
			await db
				.insert(table)
				.values({ id: crypto.randomUUID(), ...payload })
				.returning(),
			"registrado",
		);

		c.header("Location", `${c.req.path}/${data.id}`);
		return c.json({ data }, 201);
	});

	app.patch(`${base}/:id`, async (c) => {
		const db = dbOf(c);
		const id = c.req.param("id");
		const existing = await findById(db, id);
		const payload = parseBody(
			await readJsonObject(c),
			table,
			"update",
		) as InferInsertModel<TTable>;

		await validate?.(db, payload, existing);

		const data = firstOrThrow(
			await db
				.update(table)
				.set(payload)
				.where(eq(table.id, id))
				.returning(),
			"atualizado",
		);

		return c.json({ data });
	});

	app.delete(`${base}/:id`, async (c) => {
		const [removed] = await dbOf(c)
			.delete(table)
			.where(eq(table.id, c.req.param("id")))
			.returning({ id: table.id });

		if (!removed) {
			throw new ApiError(404, "NOT_FOUND", `${name} não encontrado.`);
		}

		return c.body(null, 204);
	});
}
