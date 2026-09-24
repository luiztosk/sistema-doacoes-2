import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Hono } from "hono";
import {
	assistido,
	coleta,
	doador,
	entrega,
	item,
	nomeItem,
} from "../db/schema";
import { registerCrudResource, type CrudResource } from "./crud";
import { ApiError } from "./errors";
import type { AppEnvironment } from "./types";
import {
	booleanValue,
	brazilianState,
	isoDate,
	nonEmptyString,
	nonNegativeInteger,
	nonNegativeNumber,
	nullable,
	oneOf,
	optional,
	parsePayload,
	required,
	stringValue,
	type FieldRules,
} from "./validation";

type AssistidoRecord = typeof assistido.$inferSelect;
type AssistidoCreate = Omit<
	typeof assistido.$inferInsert,
	"id" | "organizationId"
>;
type AssistidoUpdate = Partial<AssistidoCreate>;

type DoadorRecord = typeof doador.$inferSelect;
type DoadorCreate = Omit<
	typeof doador.$inferInsert,
	"id" | "organizationId"
>;
type DoadorUpdate = Partial<DoadorCreate>;

type ColetaRecord = typeof coleta.$inferSelect;
type ColetaCreate = Omit<
	typeof coleta.$inferInsert,
	"id" | "organizationId"
>;
type ColetaUpdate = Partial<ColetaCreate>;

type EntregaRecord = typeof entrega.$inferSelect;
type EntregaCreate = Omit<
	typeof entrega.$inferInsert,
	"id" | "organizationId"
>;
type EntregaUpdate = Partial<EntregaCreate>;

type ItemRecord = typeof item.$inferSelect;
type ItemCreate = Omit<typeof item.$inferInsert, "id" | "organizationId">;
type ItemUpdate = Partial<ItemCreate>;

const nullableString = nullable(stringValue);
const nullableNonEmptyString = nullable(nonEmptyString);

const addressRules = {
	telefone: optional(nullableString),
	email: optional(nullableString),
	cep: optional(nullableString),
	logradouro: optional(nullableString),
	numero: optional(nullableString),
	complemento: optional(nullableString),
	bairro: optional(nullableString),
	cidade: optional(nullableString),
	uf: optional(nullable(brazilianState)),
} satisfies FieldRules;

const assistidoRules = {
	nome: required(nonEmptyString),
	...addressRules,
	tipoImovel: optional(nullable(oneOf(["ALUGADO", "PROPRIO"] as const))),
	valorAluguel: optional(nullable(nonNegativeInteger)),
	estadoCivil: optional(
		nullable(
			oneOf([
				"SOLTEIRO",
				"CASADO",
				"DIVORCIADO",
				"VIUVO",
				"UNIAO_ESTAVEL",
			] as const),
		),
	),
	numeroAdultos: optional(nullable(nonNegativeInteger)),
	criancasPequenas: optional(nullable(nonNegativeInteger)),
	adolescentes: optional(nullable(nonNegativeInteger)),
	doentes: optional(nullable(booleanValue)),
	bolsaFamilia: optional(nullable(booleanValue)),
	aposentado: optional(nullable(booleanValue)),
	pensao: optional(nullable(booleanValue)),
	cestaBasica: optional(nullable(booleanValue)),
	atividadeRemunerada: optional(nullable(booleanValue)),
	renda: optional(nullable(nonNegativeNumber)),
	criancaEscola: optional(nullable(booleanValue)),
	observacoes: optional(nullableString),
} satisfies FieldRules;

const doadorRules = {
	nome: required(nonEmptyString),
	...addressRules,
} satisfies FieldRules;

const coletaRules = {
	doadorId: optional(nullableNonEmptyString),
	dataHora: optional(nullable(isoDate)),
} satisfies FieldRules;

const entregaRules = {
	assistidoId: optional(nullableNonEmptyString),
	dataHora: optional(nullable(isoDate)),
} satisfies FieldRules;

const itemRules = {
	nomeId: required(nonEmptyString),
	status: optional(
		oneOf(["AGUARDA_COLETA", "EM_ESTOQUE", "ENTREGUE"] as const),
	),
	coletaId: optional(nullableNonEmptyString),
	entregaId: optional(nullableNonEmptyString),
	doadorId: optional(nullableNonEmptyString),
	assistidoId: optional(nullableNonEmptyString),
} satisfies FieldRules;

function firstOrThrow<T>(records: T[], resource: string): T {
	const record = records[0];
	if (!record) {
		throw new Error(`O banco não retornou o ${resource} recém-criado.`);
	}
	return record;
}

async function requireReference(
	query: Promise<unknown[]>,
	resource: string,
): Promise<void> {
	if ((await query).length === 0) {
		throw new ApiError(
			400,
			"INVALID_REFERENCE",
			`${resource} relacionado não foi encontrado nesta organização.`,
		);
	}
}

async function requireDoador(
	db: DrizzleD1Database,
	organizationId: string,
	id: string,
) {
	await requireReference(
		db
			.select({ id: doador.id })
			.from(doador)
			.where(
				and(eq(doador.id, id), eq(doador.organizationId, organizationId)),
			)
			.limit(1),
		"Doador",
	);
}

async function requireAssistido(
	db: DrizzleD1Database,
	organizationId: string,
	id: string,
) {
	await requireReference(
		db
			.select({ id: assistido.id })
			.from(assistido)
			.where(
				and(
					eq(assistido.id, id),
					eq(assistido.organizationId, organizationId),
				),
			)
			.limit(1),
		"Assistido",
	);
}

async function validateItemReferences(
	db: DrizzleD1Database,
	organizationId: string,
	payload: ItemCreate | ItemUpdate,
) {
	if (payload.nomeId !== undefined) {
		await requireReference(
			db
				.select({ id: nomeItem.id })
				.from(nomeItem)
				.where(
					and(
						eq(nomeItem.id, payload.nomeId),
						eq(nomeItem.organizationId, organizationId),
					),
				)
				.limit(1),
			"Nome de item",
		);
	}

	if (payload.coletaId) {
		await requireReference(
			db
				.select({ id: coleta.id })
				.from(coleta)
				.where(
					and(
						eq(coleta.id, payload.coletaId),
						eq(coleta.organizationId, organizationId),
					),
				)
				.limit(1),
			"Coleta",
		);
	}

	if (payload.entregaId) {
		await requireReference(
			db
				.select({ id: entrega.id })
				.from(entrega)
				.where(
					and(
						eq(entrega.id, payload.entregaId),
						eq(entrega.organizationId, organizationId),
					),
				)
				.limit(1),
			"Entrega",
		);
	}

	if (payload.doadorId) {
		await requireDoador(db, organizationId, payload.doadorId);
	}

	if (payload.assistidoId) {
		await requireAssistido(db, organizationId, payload.assistidoId);
	}
}

const assistidosResource: CrudResource<
	AssistidoRecord,
	AssistidoCreate,
	AssistidoUpdate
> = {
	path: "assistidos",
	name: "Assistido",
	parseCreate: (body) =>
		parsePayload(body, assistidoRules, "create") as AssistidoCreate,
	parseUpdate: (body) =>
		parsePayload(body, assistidoRules, "update") as AssistidoUpdate,
	operations: {
		list: (db, organizationId) =>
			db
				.select()
				.from(assistido)
				.where(eq(assistido.organizationId, organizationId)),
		find: async (db, organizationId, id) =>
			(
				await db
					.select()
					.from(assistido)
					.where(
						and(
							eq(assistido.id, id),
							eq(assistido.organizationId, organizationId),
						),
					)
					.limit(1)
			)[0],
		create: async (db, organizationId, payload) =>
			firstOrThrow(
				await db
					.insert(assistido)
					.values({ id: crypto.randomUUID(), organizationId, ...payload })
					.returning(),
				"assistido",
			),
		update: async (db, organizationId, id, payload) =>
			(
				await db
					.update(assistido)
					.set(payload)
					.where(
						and(
							eq(assistido.id, id),
							eq(assistido.organizationId, organizationId),
						),
					)
					.returning()
			)[0],
		remove: async (db, organizationId, id) =>
			(
				await db
					.delete(assistido)
					.where(
						and(
							eq(assistido.id, id),
							eq(assistido.organizationId, organizationId),
						),
					)
					.returning({ id: assistido.id })
			).length > 0,
	},
};

const doadoresResource: CrudResource<
	DoadorRecord,
	DoadorCreate,
	DoadorUpdate
> = {
	path: "doadores",
	name: "Doador",
	parseCreate: (body) =>
		parsePayload(body, doadorRules, "create") as DoadorCreate,
	parseUpdate: (body) =>
		parsePayload(body, doadorRules, "update") as DoadorUpdate,
	operations: {
		list: (db, organizationId) =>
			db.select().from(doador).where(eq(doador.organizationId, organizationId)),
		find: async (db, organizationId, id) =>
			(
				await db
					.select()
					.from(doador)
					.where(
						and(
							eq(doador.id, id),
							eq(doador.organizationId, organizationId),
						),
					)
					.limit(1)
			)[0],
		create: async (db, organizationId, payload) =>
			firstOrThrow(
				await db
					.insert(doador)
					.values({ id: crypto.randomUUID(), organizationId, ...payload })
					.returning(),
				"doador",
			),
		update: async (db, organizationId, id, payload) =>
			(
				await db
					.update(doador)
					.set(payload)
					.where(
						and(
							eq(doador.id, id),
							eq(doador.organizationId, organizationId),
						),
					)
					.returning()
			)[0],
		remove: async (db, organizationId, id) =>
			(
				await db
					.delete(doador)
					.where(
						and(
							eq(doador.id, id),
							eq(doador.organizationId, organizationId),
						),
					)
					.returning({ id: doador.id })
			).length > 0,
	},
};

const coletasResource: CrudResource<ColetaRecord, ColetaCreate, ColetaUpdate> = {
	path: "coletas",
	name: "Coleta",
	parseCreate: (body) =>
		parsePayload(body, coletaRules, "create") as ColetaCreate,
	parseUpdate: (body) =>
		parsePayload(body, coletaRules, "update") as ColetaUpdate,
	operations: {
		list: (db, organizationId) =>
			db.select().from(coleta).where(eq(coleta.organizationId, organizationId)),
		find: async (db, organizationId, id) =>
			(
				await db
					.select()
					.from(coleta)
					.where(
						and(
							eq(coleta.id, id),
							eq(coleta.organizationId, organizationId),
						),
					)
					.limit(1)
			)[0],
		create: async (db, organizationId, payload) => {
			if (payload.doadorId) {
				await requireDoador(db, organizationId, payload.doadorId);
			}
			return firstOrThrow(
				await db
					.insert(coleta)
					.values({ id: crypto.randomUUID(), organizationId, ...payload })
					.returning(),
				"coleta",
			);
		},
		update: async (db, organizationId, id, payload) => {
			if (payload.doadorId) {
				await requireDoador(db, organizationId, payload.doadorId);
			}
			return (
				await db
					.update(coleta)
					.set(payload)
					.where(
						and(
							eq(coleta.id, id),
							eq(coleta.organizationId, organizationId),
						),
					)
					.returning()
			)[0];
		},
		remove: async (db, organizationId, id) =>
			(
				await db
					.delete(coleta)
					.where(
						and(
							eq(coleta.id, id),
							eq(coleta.organizationId, organizationId),
						),
					)
					.returning({ id: coleta.id })
			).length > 0,
	},
};

const entregasResource: CrudResource<
	EntregaRecord,
	EntregaCreate,
	EntregaUpdate
> = {
	path: "entregas",
	name: "Entrega",
	parseCreate: (body) =>
		parsePayload(body, entregaRules, "create") as EntregaCreate,
	parseUpdate: (body) =>
		parsePayload(body, entregaRules, "update") as EntregaUpdate,
	operations: {
		list: (db, organizationId) =>
			db.select().from(entrega).where(eq(entrega.organizationId, organizationId)),
		find: async (db, organizationId, id) =>
			(
				await db
					.select()
					.from(entrega)
					.where(
						and(
							eq(entrega.id, id),
							eq(entrega.organizationId, organizationId),
						),
					)
					.limit(1)
			)[0],
		create: async (db, organizationId, payload) => {
			if (payload.assistidoId) {
				await requireAssistido(db, organizationId, payload.assistidoId);
			}
			return firstOrThrow(
				await db
					.insert(entrega)
					.values({ id: crypto.randomUUID(), organizationId, ...payload })
					.returning(),
				"entrega",
			);
		},
		update: async (db, organizationId, id, payload) => {
			if (payload.assistidoId) {
				await requireAssistido(db, organizationId, payload.assistidoId);
			}
			return (
				await db
					.update(entrega)
					.set(payload)
					.where(
						and(
							eq(entrega.id, id),
							eq(entrega.organizationId, organizationId),
						),
					)
					.returning()
			)[0];
		},
		remove: async (db, organizationId, id) =>
			(
				await db
					.delete(entrega)
					.where(
						and(
							eq(entrega.id, id),
							eq(entrega.organizationId, organizationId),
						),
					)
					.returning({ id: entrega.id })
			).length > 0,
	},
};

const allowedStatusTransitions: Record<ItemRecord["status"], ItemRecord["status"][]> = {
	AGUARDA_COLETA: ["EM_ESTOQUE"],
	EM_ESTOQUE: ["ENTREGUE"],
	ENTREGUE: [],
};

const itensResource: CrudResource<ItemRecord, ItemCreate, ItemUpdate> = {
	path: "itens",
	name: "Item",
	parseCreate: (body) =>
		parsePayload(body, itemRules, "create") as ItemCreate,
	parseUpdate: (body) =>
		parsePayload(body, itemRules, "update") as ItemUpdate,
	validateCreate: (payload) => {
		if (payload.status && payload.status !== "AGUARDA_COLETA") {
			throw new ApiError(
				400,
				"INVALID_STATUS_TRANSITION",
				"Todo item novo deve iniciar com o status AGUARDA_COLETA.",
			);
		}
	},
	validateUpdate: (existing, payload) => {
		if (
			payload.status &&
			payload.status !== existing.status &&
			!allowedStatusTransitions[existing.status].includes(payload.status)
		) {
			throw new ApiError(
				400,
				"INVALID_STATUS_TRANSITION",
				`Não é permitido alterar o status de ${existing.status} para ${payload.status}.`,
			);
		}

		const resultingStatus = payload.status ?? existing.status;
		if (resultingStatus === "ENTREGUE") {
			const entregaId =
				payload.entregaId === undefined
					? existing.entregaId
					: payload.entregaId;
			const assistidoId =
				payload.assistidoId === undefined
					? existing.assistidoId
					: payload.assistidoId;
			if (!entregaId || !assistidoId) {
				throw new ApiError(
					400,
					"DELIVERY_REQUIRED",
					"Um item entregue deve informar entregaId e assistidoId.",
				);
			}
		}
	},
	operations: {
		list: (db, organizationId) =>
			db.select().from(item).where(eq(item.organizationId, organizationId)),
		find: async (db, organizationId, id) =>
			(
				await db
					.select()
					.from(item)
					.where(
						and(eq(item.id, id), eq(item.organizationId, organizationId)),
					)
					.limit(1)
			)[0],
		create: async (db, organizationId, payload) => {
			await validateItemReferences(db, organizationId, payload);
			return firstOrThrow(
				await db
					.insert(item)
					.values({ id: crypto.randomUUID(), organizationId, ...payload })
					.returning(),
				"item",
			);
		},
		update: async (db, organizationId, id, payload) => {
			await validateItemReferences(db, organizationId, payload);
			return (
				await db
					.update(item)
					.set(payload)
					.where(
						and(eq(item.id, id), eq(item.organizationId, organizationId)),
					)
					.returning()
			)[0];
		},
		remove: async (db, organizationId, id) =>
			(
				await db
					.delete(item)
					.where(
						and(eq(item.id, id), eq(item.organizationId, organizationId)),
					)
					.returning({ id: item.id })
			).length > 0,
	},
};

export function registerResources(app: Hono<AppEnvironment>) {
	registerCrudResource(app, assistidosResource);
	registerCrudResource(app, doadoresResource);
	registerCrudResource(app, coletasResource);
	registerCrudResource(app, entregasResource);
	registerCrudResource(app, itensResource);
}
