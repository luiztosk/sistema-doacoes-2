import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import type { AnySQLiteColumn, AnySQLiteTable } from "drizzle-orm/sqlite-core";
import type { Context, Hono } from "hono";
import type { z } from "zod";
import {
	assistido,
	assistidoInsertSchema,
	assistidoUpdateSchema,
	coleta,
	coletaInsertSchema,
	coletaUpdateSchema,
	doador,
	doadorInsertSchema,
	doadorUpdateSchema,
	entrega,
	entregaInsertSchema,
	entregaUpdateSchema,
	item,
	itemInsertSchema,
	itemUpdateSchema,
} from "../db/schema";
import { apiError, parseBody, readJsonObject } from "./errors";

type TableWithId = AnySQLiteTable & { id: AnySQLiteColumn };

type ApiBindings = { Bindings: Env };

type ResourcePayload<TTable extends TableWithId> = Omit<
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
};

const dbOf = (c: Context<ApiBindings>) => drizzle(c.env.prod_sistema_doacoes_2);

function registerResource<TTable extends TableWithId>(
	app: Hono<ApiBindings>,
	resource: ResourceDescriptor<TTable>,
) {
	const { table, path, name, schemas, validate } = resource;
	const base = `/${path}`;
	const updateSchema = schemas.update ?? schemas.insert;

	async function findById(db: DrizzleD1Database, id: string) {
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
		const data = await findById(dbOf(c), c.req.param("id"));
		return c.json({ data });
	});

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
				.values({ id: crypto.randomUUID(), ...payload } as InferInsertModel<TTable>)
				.returning(),
			"created",
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
			updateSchema,
			"update",
		);

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

type ItemPayload = ResourcePayload<typeof item>;
type ItemRow = InferSelectModel<typeof item>;

const allowedStatusTransitions: Record<
	ItemRow["status"],
	ItemRow["status"][]
> = {
	AGUARDA_COLETA: ["EM_ESTOQUE"],
	EM_ESTOQUE: ["ENTREGUE"],
	ENTREGUE: [],
};

function validateItem(
	_db: DrizzleD1Database,
	payload: Partial<ItemPayload>,
	existing?: ItemRow,
): void {
	if (!existing) {
		if (payload.status && payload.status !== "AGUARDA_COLETA") {
			throw apiError(
				400,
				"INVALID_STATUS_TRANSITION",
				"A new item must start with the status AGUARDA_COLETA.",
			);
		}
		return;
	}

	if (
		payload.status &&
		payload.status !== existing.status &&
		!allowedStatusTransitions[existing.status].includes(payload.status)
	) {
		throw apiError(
			400,
			"INVALID_STATUS_TRANSITION",
			`Changing the status from ${existing.status} to ${payload.status} is not allowed.`,
		);
	}

	const resultingStatus = payload.status ?? existing.status;
	if (resultingStatus === "ENTREGUE") {
		const entregaId =
			payload.entregaId === undefined
				? existing.entregaId
				: payload.entregaId;

		if (!entregaId) {
			throw apiError(
				400,
				"DELIVERY_REQUIRED",
				"A delivered item must have an entregaId.",
			);
		}
	}
}

export function registerResources(app: Hono<{ Bindings: Env }>) {
	registerResource(app, {
		table: assistido,
		path: "assistidos",
		name: "Assistido",
		schemas: { insert: assistidoInsertSchema, update: assistidoUpdateSchema },
	});
	registerResource(app, {
		table: doador,
		path: "doadores",
		name: "Doador",
		schemas: { insert: doadorInsertSchema, update: doadorUpdateSchema },
	});
	registerResource(app, {
		table: coleta,
		path: "coletas",
		name: "Coleta",
		schemas: { insert: coletaInsertSchema, update: coletaUpdateSchema },
	});
	registerResource(app, {
		table: entrega,
		path: "entregas",
		name: "Entrega",
		schemas: { insert: entregaInsertSchema, update: entregaUpdateSchema },
	});
	registerResource(app, {
		table: item,
		path: "itens",
		name: "Item",
		schemas: { insert: itemInsertSchema, update: itemUpdateSchema },
		validate: validateItem,
	});
}
