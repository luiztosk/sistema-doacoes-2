import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Hono } from "hono";
import { assistido, coleta, doador, entrega, item, nomeItem } from "../db/schema";
import { registerResource } from "./crud";
import { ApiError } from "./errors";

type ColetaPayload = InferInsertModel<typeof coleta>;

type EntregaPayload = InferInsertModel<typeof entrega>;

type ItemPayload = InferInsertModel<typeof item>;
type ItemRow = InferSelectModel<typeof item>;

async function requireReference(
	query: Promise<unknown[]>,
	resource: string,
): Promise<void> {
	if ((await query).length === 0) {
		throw new ApiError(
			400,
			"INVALID_REFERENCE",
			`O registro de ${resource} não foi encontrado.`,
		);
	}
}

function requireDoador(db: DrizzleD1Database, id: string): Promise<void> {
	return requireReference(
		db
			.select({ id: doador.id })
			.from(doador)
			.where(eq(doador.id, id))
			.limit(1),
		"Doador",
	);
}

function requireAssistido(db: DrizzleD1Database, id: string): Promise<void> {
	return requireReference(
		db
			.select({ id: assistido.id })
			.from(assistido)
			.where(eq(assistido.id, id))
			.limit(1),
		"Assistido",
	);
}

async function validateColeta(
	db: DrizzleD1Database,
	payload: ColetaPayload,
): Promise<void> {
	if (payload.doadorId) {
		await requireDoador(db, payload.doadorId);
	}
}

async function validateEntrega(
	db: DrizzleD1Database,
	payload: EntregaPayload,
): Promise<void> {
	if (payload.assistidoId) {
		await requireAssistido(db, payload.assistidoId);
	}
}

const allowedStatusTransitions: Record<
	ItemRow["status"],
	ItemRow["status"][]
> = {
	AGUARDA_COLETA: ["EM_ESTOQUE"],
	EM_ESTOQUE: ["ENTREGUE"],
	ENTREGUE: [],
};

async function validateItem(
	db: DrizzleD1Database,
	payload: ItemPayload,
	existing?: ItemRow,
): Promise<void> {
	if (payload.nomeId !== undefined) {
		await requireReference(
			db
				.select({ id: nomeItem.id })
				.from(nomeItem)
				.where(eq(nomeItem.id, payload.nomeId))
				.limit(1),
			"Nome de item",
		);
	}
	if (payload.coletaId) {
		await requireReference(
			db
				.select({ id: coleta.id })
				.from(coleta)
				.where(eq(coleta.id, payload.coletaId))
				.limit(1),
			"Coleta",
		);
	}
	if (payload.entregaId) {
		await requireReference(
			db
				.select({ id: entrega.id })
				.from(entrega)
				.where(eq(entrega.id, payload.entregaId))
				.limit(1),
			"Entrega",
		);
	}

	if (!existing) {
		if (payload.status && payload.status !== "AGUARDA_COLETA") {
			throw new ApiError(
				400,
				"INVALID_STATUS_TRANSITION",
				"Todo item novo deve iniciar com o status AGUARDA_COLETA.",
			);
		}
		return;
	}

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

		if (!entregaId) {
			throw new ApiError(
				400,
				"DELIVERY_REQUIRED",
				"Um item entregue deve informar entregaId.",
			);
		}
	}
}

export function registerResources(app: Hono<{ Bindings: Env }>) {
	registerResource(app, assistido, "assistidos", "Assistido");
	registerResource(app, doador, "doadores", "Doador");
	registerResource(app, coleta, "coletas", "Coleta", validateColeta);
	registerResource(app, entrega, "entregas", "Entrega", validateEntrega);
	registerResource(app, item, "itens", "Item", validateItem);
}
