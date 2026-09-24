import type { Context } from "hono";
import { ApiError } from "./errors";

type JsonObject = Record<string, unknown>;
type ValueParser = (value: unknown, field: string) => unknown;

export type FieldRule = {
	parse: ValueParser;
	requiredOnCreate?: boolean;
};

export type FieldRules = Record<string, FieldRule>;

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

export function parsePayload(
	body: JsonObject,
	rules: FieldRules,
	mode: "create" | "update",
): JsonObject {
	const reservedFields = ["id", "organizationId"];
	const receivedFields = Object.keys(body);
	const readOnlyField = receivedFields.find((field) =>
		reservedFields.includes(field),
	);

	if (readOnlyField) {
		throw new ApiError(
			400,
			"READ_ONLY_FIELD",
			`O campo '${readOnlyField}' é definido pelo servidor.`,
		);
	}

	const unknownField = receivedFields.find((field) => !(field in rules));
	if (unknownField) {
		throw new ApiError(
			400,
			"UNKNOWN_FIELD",
			`O campo '${unknownField}' não é aceito neste recurso.`,
		);
	}

	if (mode === "update" && receivedFields.length === 0) {
		throw new ApiError(
			400,
			"EMPTY_UPDATE",
			"Informe ao menos um campo para atualizar.",
		);
	}

	const parsed: JsonObject = {};
	for (const [field, rule] of Object.entries(rules)) {
		const value = body[field];
		if (value === undefined) {
			if (mode === "create" && rule.requiredOnCreate) {
				throw new ApiError(
					400,
					"REQUIRED_FIELD",
					`O campo '${field}' é obrigatório.`,
				);
			}
			continue;
		}

		parsed[field] = rule.parse(value, field);
	}

	return parsed;
}

export function required(parse: ValueParser): FieldRule {
	return { parse, requiredOnCreate: true };
}

export function optional(parse: ValueParser): FieldRule {
	return { parse };
}

export function nullable(parse: ValueParser): ValueParser {
	return (value, field) => (value === null ? null : parse(value, field));
}

export const nonEmptyString: ValueParser = (value, field) => {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new ApiError(
			400,
			"INVALID_FIELD",
			`O campo '${field}' deve ser um texto não vazio.`,
		);
	}
	return value.trim();
};

export const stringValue: ValueParser = (value, field) => {
	if (typeof value !== "string") {
		throw new ApiError(
			400,
			"INVALID_FIELD",
			`O campo '${field}' deve ser um texto.`,
		);
	}
	return value;
};

export const booleanValue: ValueParser = (value, field) => {
	if (typeof value !== "boolean") {
		throw new ApiError(
			400,
			"INVALID_FIELD",
			`O campo '${field}' deve ser booleano.`,
		);
	}
	return value;
};

export const nonNegativeNumber: ValueParser = (value, field) => {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		throw new ApiError(
			400,
			"INVALID_FIELD",
			`O campo '${field}' deve ser um número maior ou igual a zero.`,
		);
	}
	return value;
};

export const nonNegativeInteger: ValueParser = (value, field) => {
	const parsed = nonNegativeNumber(value, field);
	if (!Number.isInteger(parsed)) {
		throw new ApiError(
			400,
			"INVALID_FIELD",
			`O campo '${field}' deve ser um número inteiro.`,
		);
	}
	return parsed;
};

export const isoDate: ValueParser = (value, field) => {
	if (typeof value !== "string") {
		throw new ApiError(
			400,
			"INVALID_FIELD",
			`O campo '${field}' deve ser uma data ISO 8601.`,
		);
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new ApiError(
			400,
			"INVALID_FIELD",
			`O campo '${field}' deve ser uma data ISO 8601 válida.`,
		);
	}
	return date;
};

export function oneOf<const T extends readonly string[]>(values: T): ValueParser {
	return (value, field) => {
		if (typeof value !== "string" || !values.includes(value)) {
			throw new ApiError(
				400,
				"INVALID_FIELD",
				`O campo '${field}' deve ser um destes valores: ${values.join(", ")}.`,
			);
		}
		return value as T[number];
	};
}

export const brazilianState: ValueParser = (value, field) => {
	if (typeof value !== "string" || !/^[A-Za-z]{2}$/.test(value)) {
		throw new ApiError(
			400,
			"INVALID_FIELD",
			`O campo '${field}' deve ter uma sigla de UF com duas letras.`,
		);
	}
	return value.toUpperCase();
};
