import { getTableColumns } from "drizzle-orm";
import type { AnySQLiteTable } from "drizzle-orm/sqlite-core";
import type { Context } from "hono";
import { ApiError } from "./errors";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonObject(c: Context): Promise<JsonObject> {
	const contentType = c.req.header("content-type") ?? "";
	if (!contentType.toLowerCase().includes("application/json")) {
		throw new ApiError(
			415,
			"UNSUPPORTED_MEDIA_TYPE",
			"Envie o corpo como application/json.",
		);
	}

	let body: unknown;
	try {
		body = await c.req.json<unknown>();
	} catch {
		throw new ApiError(400, "INVALID_JSON", "O JSON enviado é inválido.");
	}

	if (!isJsonObject(body)) {
		throw new ApiError(
			400,
			"INVALID_BODY",
			"O corpo da requisição deve ser um objeto JSON.",
		);
	}

	return body;
}

/** The parts of a drizzle column this module needs. */
type ColumnMeta = {
	columnType: string;
	notNull: boolean;
	primary: boolean;
	hasDefault: boolean;
	enumValues?: readonly string[];
};

function columnsOf(table: AnySQLiteTable): Record<string, ColumnMeta> {
	return getTableColumns(table) as unknown as Record<string, ColumnMeta>;
}

/**
 * Turns a JSON value into the JS value drizzle expects for that column, using the
 * column's own metadata. This is deserialization, not validation: whether a value
 * is *acceptable* (minimum length, ranges, letter case) is deliberately not
 * checked here. That belongs to zod through drizzle-zod's `createInsertSchema`,
 * and the durable half to `check()` constraints in the database.
 */
function deserialize(
	column: ColumnMeta,
	value: unknown,
	field: string,
): unknown {
	const invalid = (expected: string) =>
		new ApiError(
			400,
			"INVALID_VALUE",
			`O campo '${field}' deve ser ${expected}.`,
		);

	switch (column.columnType) {
		// Same conversion the seed script applies to `dataHora`.
		case "SQLiteTimestamp":
		case "SQLiteDate":
		case "SQLiteDateTime": {
			const date = new Date(value as string);
			if (Number.isNaN(date.getTime())) {
				throw invalid("uma data válida");
			}
			return date;
		}

		case "SQLiteBoolean": {
			if (typeof value !== "boolean") {
				throw invalid("booleano");
			}
			return value;
		}

		case "SQLiteInteger":
		case "SQLiteReal": {
			if (typeof value !== "number" || !Number.isFinite(value)) {
				throw invalid("um número");
			}
			return value;
		}

		default: {
			if (typeof value !== "string") {
				throw invalid("um texto");
			}
			if (column.enumValues && !column.enumValues.includes(value)) {
				throw invalid(`um destes valores: ${column.enumValues.join(", ")}`);
			}
			return value;
		}
	}
}

export function parseBody(
	body: JsonObject,
	table: AnySQLiteTable,
	mode: "create" | "update",
): JsonObject {
	if ("id" in body) {
		throw new ApiError(
			400,
			"READ_ONLY_FIELD",
			"O campo 'id' é definido pelo servidor.",
		);
	}

	if (mode === "update" && Object.keys(body).length === 0) {
		throw new ApiError(
			400,
			"EMPTY_UPDATE",
			"Informe ao menos um campo para atualizar.",
		);
	}

	const columns = columnsOf(table);

	const unknownField = Object.keys(body).find(
		(field) => !(field in columns),
	);
	if (unknownField) {
		throw new ApiError(
			400,
			"UNKNOWN_FIELD",
			`O campo '${unknownField}' não é aceito neste recurso.`,
		);
	}

	// A column is expected on create when the database will not supply it: the
	// Worker generates the primary key, and anything with a default is optional.
	if (mode === "create") {
		const missing = Object.entries(columns).find(
			([field, column]) =>
				!column.primary &&
				!column.hasDefault &&
				column.notNull &&
				body[field] == null,
		);
		if (missing) {
			throw new ApiError(
				400,
				"REQUIRED_FIELD",
				`O campo '${missing[0]}' é obrigatório.`,
			);
		}
	}

	const parsed: JsonObject = {};
	for (const [field, value] of Object.entries(body)) {
		parsed[field] = value === null ? null : deserialize(columns[field], value, field);
	}

	return parsed;
}
