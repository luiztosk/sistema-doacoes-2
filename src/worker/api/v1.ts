import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
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
	nomeItem,
} from "../db/schema";
import type { AppEnv } from "../env";
import { apiError, parseBody, readJsonObject } from "./errors";

type TableWithTenant = AnySQLiteTable & {
	id: AnySQLiteColumn;
	organizationId: AnySQLiteColumn;
};

type ResourcePayload<TTable extends TableWithTenant> = Omit<
	InferInsertModel<TTable>,
	"id" | "organizationId"
>;

type ResourceDescriptor<TTable extends TableWithTenant> = {
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
		organizationId: string,
		existing?: InferSelectModel<TTable>,
	) => void | Promise<void>;
};

const dbOf = (c: Context<AppEnv>) => drizzle(c.env.prod_sistema_doacoes_2);

const WRITE_ROLES = new Set(["owner", "admin", "staff", "member"]);

function organizationIdOf(c: Context<AppEnv>) {
	return c.get("organization").id;
}

function requireWritePermission(c: Context<AppEnv>) {
	const roles = c
		.get("organization")
		.role.split(",")
		.map((role) => role.trim());

	if (!roles.some((role) => WRITE_ROLES.has(role))) {
		throw apiError(
			403,
			"FORBIDDEN",
			"Your role cannot change records in this organization.",
		);
	}
}

function registerResource<TTable extends TableWithTenant>(
	app: Hono<AppEnv>,
	resource: ResourceDescriptor<TTable>,
) {
	const { table, path, name, schemas, validate } = resource;
	const base = `/${path}`;
	const updateSchema = schemas.update ?? schemas.insert;

	async function findById(
		db: DrizzleD1Database,
		organizationId: string,
		id: string,
	) {
		const [record] = await db
			.select()
			.from(table)
			.where(
				and(eq(table.id, id), eq(table.organizationId, organizationId)),
			)
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
		const data = await dbOf(c)
			.select()
			.from(table)
			.where(eq(table.organizationId, organizationIdOf(c)));
		return c.json({ data });
	});

	app.get(`${base}/:id`, async (c) => {
		const data = await findById(
			dbOf(c),
			organizationIdOf(c),
			c.req.param("id"),
		);
		return c.json({ data });
	});

	app.post(base, async (c) => {
		requireWritePermission(c);
		const db = dbOf(c);
		const organizationId = organizationIdOf(c);
		const payload = parseBody(
			await readJsonObject(c),
			schemas.insert,
			"create",
		);

		await validate?.(db, payload, organizationId);

		const data = firstOrThrow(
			await db
				.insert(table)
				.values({
					id: crypto.randomUUID(),
					organizationId,
					...payload,
				} as InferInsertModel<TTable>)
				.returning(),
			"created",
		);

		c.header("Location", `${c.req.path}/${data.id}`);
		return c.json({ data }, 201);
	});

	app.patch(`${base}/:id`, async (c) => {
		requireWritePermission(c);
		const db = dbOf(c);
		const organizationId = organizationIdOf(c);
		const id = c.req.param("id");
		const existing = await findById(db, organizationId, id);
		const payload = parseBody(
			await readJsonObject(c),
			updateSchema,
			"update",
		);

		await validate?.(db, payload, organizationId, existing);

		const data = firstOrThrow(
			await db
				.update(table)
				.set(payload as Partial<InferInsertModel<TTable>>)
				.where(
					and(eq(table.id, id), eq(table.organizationId, organizationId)),
				)
				.returning(),
			"updated",
		);

		return c.json({ data });
	});

	app.delete(`${base}/:id`, async (c) => {
		requireWritePermission(c);
		const organizationId = organizationIdOf(c);
		const [removed] = await dbOf(c)
			.delete(table)
			.where(
				and(
					eq(table.id, c.req.param("id")),
					eq(table.organizationId, organizationId),
				),
			)
			.returning({ id: table.id });

		if (!removed) {
			throw apiError(404, "NOT_FOUND", `${name} not found.`);
		}

		return c.body(null, 204);
	});
}

async function requireTenantReference(
	db: DrizzleD1Database,
	table: TableWithTenant,
	id: string | null | undefined,
	organizationId: string,
) {
	if (id == null) return;

	const [record] = await db
		.select({ id: table.id })
		.from(table)
		.where(and(eq(table.id, id), eq(table.organizationId, organizationId)))
		.limit(1);

	if (!record) {
		throw apiError(
			400,
			"INVALID_REFERENCE",
			"One of the references sent does not exist in the active organization.",
		);
	}
}

type AssistidoPayload = ResourcePayload<typeof assistido>;
type AssistidoRow = InferSelectModel<typeof assistido>;

function validateAssistido(
	_db: DrizzleD1Database,
	payload: Partial<AssistidoPayload>,
	_organizationId: string,
	existing?: AssistidoRow,
) {
	if (!existing) return;

	const tipoImovel = payload.tipoImovel ?? existing.tipoImovel;
	const valorAluguel =
		payload.valorAluguel === undefined
			? existing.valorAluguel
			: payload.valorAluguel;
	const valido =
		tipoImovel == null ||
		(tipoImovel === "PROPRIO" && valorAluguel == null) ||
		(tipoImovel === "ALUGADO" && valorAluguel != null && valorAluguel > 0);

	if (!valido) {
		throw apiError(
			400,
			"INVALID_VALUE",
			"'valorAluguel' only exists on an 'ALUGADO' property, and an 'ALUGADO' property requires a 'valorAluguel' greater than zero.",
		);
	}
}

type ColetaPayload = ResourcePayload<typeof coleta>;

async function validateColeta(
	db: DrizzleD1Database,
	payload: Partial<ColetaPayload>,
	organizationId: string,
) {
	await requireTenantReference(db, doador, payload.doadorId, organizationId);
}

type EntregaPayload = ResourcePayload<typeof entrega>;

async function validateEntrega(
	db: DrizzleD1Database,
	payload: Partial<EntregaPayload>,
	organizationId: string,
) {
	await requireTenantReference(
		db,
		assistido,
		payload.assistidoId,
		organizationId,
	);
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
	db: DrizzleD1Database,
	payload: Partial<ItemPayload>,
	organizationId: string,
	existing?: ItemRow,
): Promise<void> {
	return validateItemInOrganization(
		db,
		payload,
		organizationId,
		existing,
	);
}

async function validateItemInOrganization(
	db: DrizzleD1Database,
	payload: Partial<ItemPayload>,
	organizationId: string,
	existing?: ItemRow,
) {
	if (!existing) {
		if (payload.status && payload.status !== "AGUARDA_COLETA") {
			throw apiError(
				400,
				"INVALID_STATUS_TRANSITION",
				"A new item must start with the status AGUARDA_COLETA.",
			);
		}

		if (payload.entregaId && !payload.coletaId) {
			throw apiError(
				400,
				"COLLECTION_REQUIRED",
				"An item with an entregaId must also have a coletaId.",
			);
		}

		await Promise.all([
			requireTenantReference(db, nomeItem, payload.nomeId, organizationId),
			requireTenantReference(db, coleta, payload.coletaId, organizationId),
			requireTenantReference(db, entrega, payload.entregaId, organizationId),
		]);
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
	const resultingColetaId =
		payload.coletaId === undefined ? existing.coletaId : payload.coletaId;
	const resultingEntregaId =
		payload.entregaId === undefined ? existing.entregaId : payload.entregaId;

	if (resultingEntregaId && !resultingColetaId) {
		throw apiError(
			400,
			"COLLECTION_REQUIRED",
			"An item with an entregaId must also have a coletaId.",
		);
	}

	if (resultingStatus === "ENTREGUE") {
		if (!resultingEntregaId) {
			throw apiError(
				400,
				"DELIVERY_REQUIRED",
				"A delivered item must have an entregaId.",
			);
		}
	}

	await Promise.all([
		requireTenantReference(db, nomeItem, payload.nomeId, organizationId),
		requireTenantReference(db, coleta, payload.coletaId, organizationId),
		requireTenantReference(db, entrega, payload.entregaId, organizationId),
	]);
}

export function registerResources(app: Hono<AppEnv>) {
	registerResource(app, {
		table: assistido,
		path: "assistidos",
		name: "Assistido",
		schemas: { insert: assistidoInsertSchema, update: assistidoUpdateSchema },
		validate: validateAssistido,
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
		validate: validateColeta,
	});
	registerResource(app, {
		table: entrega,
		path: "entregas",
		name: "Entrega",
		schemas: { insert: entregaInsertSchema, update: entregaUpdateSchema },
		validate: validateEntrega,
	});
	registerResource(app, {
		table: item,
		path: "itens",
		name: "Item",
		schemas: { insert: itemInsertSchema, update: itemUpdateSchema },
		validate: validateItem,
	});
}
