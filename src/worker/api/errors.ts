import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { errorCodeSchema } from "../../schemas/api/common";

export type ApiErrorStatus = 400 | 404 | 409 | 415;

type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(
	status: ApiErrorStatus | 500,
	code: string,
	message: string,
): Response {
	return Response.json({ error: { code, message } }, { status });
}

/**
 * O erro da API é um envelope pronto: o `code` é o contrato, e a `message` é
 * uma frase em inglês. Ele é uma classe própria — e não um `HTTPException` —
 * porque o `handleApiError` precisa distinguir "a API recusou" de "o Hono
 * recusou" (content-type errado, JSON malformado).
 */
export class ApiError extends Error {
	override name = "ApiError";

	constructor(
		readonly status: ApiErrorStatus,
		readonly code: string,
		readonly message: string,
	) {
		super(message);
	}
}

export function apiError(
	status: ApiErrorStatus,
	code: string,
	message: string,
): ApiError {
	return new ApiError(status, code, message);
}

export function notFoundError(message: string): ApiError {
	return apiError(404, "NOT_FOUND", message);
}

export function apiErrorResponse(error: ApiError): Response {
	return errorResponse(error.status, error.code, error.message);
}

export async function readJsonObject(c: Context): Promise<JsonObject> {
	const contentType = c.req.header("content-type") ?? "";
	if (!contentType.toLowerCase().includes("application/json")) {
		throw apiError(
			415,
			"UNSUPPORTED_MEDIA_TYPE",
			"Send the body as application/json.",
		);
	}

	let body: unknown;
	try {
		body = await c.req.json<unknown>();
	} catch {
		throw apiError(400, "INVALID_JSON", "The JSON sent is invalid.");
	}

	if (!isJsonObject(body)) {
		throw apiError(
			400,
			"INVALID_BODY",
			"The request body must be a JSON object.",
		);
	}

	return body;
}

function issuePath(issue: z.core.$ZodIssue): string {
	return issue.path.map((part) => String(part)).join(".");
}

function valueAtPath(body: unknown, path: readonly PropertyKey[]): unknown {
	let current: unknown = body;

	for (const part of path) {
		if (current === null || typeof current !== "object") return undefined;
		current = (current as Record<PropertyKey, unknown>)[part];
	}

	return current;
}

function invalidValue(field: string): ApiError {
	return apiError(
		400,
		"INVALID_VALUE",
		`Field '${field}' has an invalid value.`,
	);
}

/**
 * A frase da resposta é montada aqui, em inglês, a partir do `issue.code` —
 * a mensagem do zod é em português e serve ao formulário, não ao cliente da
 * API. Por isso nenhum schema de contrato usa `.refine()`: o ramo `custom` é
 * o único que carregaria a mensagem do zod para a resposta, e ele não chega
 * aqui porque a validação inteira acontece antes.
 */
export function errorFromIssue(
	issue: z.core.$ZodIssue,
	body: unknown,
): ApiError {
	const path = issuePath(issue);
	const field = path === "" ? "" : `Field '${path}' `;
	const detail = issue as unknown as Record<string, unknown>;

	switch (issue.code) {
		case "unrecognized_keys": {
			const keys = (detail.keys as string[] | undefined) ?? [];
			if (keys.includes("id")) {
				return apiError(
					400,
					"READ_ONLY_FIELD",
					"Field 'id' is set by the server.",
				);
			}
			const [key] = keys;
			return apiError(
				400,
				"UNKNOWN_FIELD",
				`Field '${key}' is not accepted in this resource.`,
			);
		}

		case "invalid_type": {
			const value = valueAtPath(body, issue.path);
			if (value === undefined || value === null) {
				return apiError(
					400,
					"REQUIRED_FIELD",
					`Field '${path}' is required.`,
				);
			}
			if (path === "" && issue.expected === "object") {
				return apiError(
					400,
					"INVALID_BODY",
					"The request body must be a JSON object.",
				);
			}
			return invalidValue(path);
		}

		case "invalid_value": {
			const options = Object.values(
				(detail.values as Record<string, string> | undefined) ?? {},
			);
			return apiError(
				400,
				"INVALID_VALUE",
				`${field}must be one of: ${options.join(", ")}.`,
			);
		}

		default:
			return invalidValue(path);
	}
}

/**
 * O `id` é do servidor e um `PATCH` sem campo nenhum é um pedido vazio. As
 * duas regras são do handler, e não do schema: o schema do `PATCH` não tem
 * `id` — ele é recusado como campo desconhecido — e um objeto vazio é um
 * `PATCH` válido para o zod.
 */
export function rejectReadOnlyId(body: JsonObject): void {
	if ("id" in body) {
		throw apiError(400, "READ_ONLY_FIELD", "Field 'id' is set by the server.");
	}
}

export function rejectEmptyUpdate(body: JsonObject): void {
	if (Object.keys(body).length === 0) {
		throw apiError(400, "EMPTY_UPDATE", "Send at least one field to update.");
	}
}

export function errorChainMessage(error: Error): string {
	const messages: string[] = [];
	let current: unknown = error;

	for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
		messages.push(current.message);
		current = (current as Error & { cause?: unknown }).cause;
	}

	return messages.join(" ");
}

const TRIGGER_CODES = [
	"INSUFFICIENT_STOCK",
	"NEGATIVE_STOCK",
	"INVALID_RELEASE",
] as const;

/**
 * A guarda do estoque mora num trigger do D1, e o trigger aborta com
 * `RAISE(ABORT, 'INSUFFICIENT_STOCK')`. O D1 devolve isso como
 * `SQLITE_CONSTRAINT_TRIGGER`, com a mensagem intacta — e sem um ramo para
 * esse código, a guarda vira `500 INTERNAL_ERROR` e o cliente perde o motivo.
 */
function triggerError(message: string): Response | undefined {
	for (const code of TRIGGER_CODES) {
		if (!message.includes(code)) continue;
		return errorResponse(
			409,
			code,
			code === "INSUFFICIENT_STOCK"
				? "There is not enough stock for this operation."
				: code === "NEGATIVE_STOCK"
					? "The operation would leave the stock below the reserved amount."
					: "There is not enough reserved stock to release.",
		);
	}

	return undefined;
}

function invalidReference(method: string): Response {
	if (method === "DELETE") {
		return errorResponse(
			409,
			"CONFLICT",
			"The operation conflicts with related records.",
		);
	}

	return errorResponse(
		400,
		"INVALID_REFERENCE",
		"One of the references sent does not exist.",
	);
}

export function handleApiError(error: Error, c: Context) {
	if (error instanceof ApiError) {
		return errorResponse(error.status, error.code, error.message);
	}

	if (error instanceof HTTPException) {
		if (error.status === 401) {
			return c.body(null, 401);
		}

		if (error.status === 415) {
			return errorResponse(
				415,
				"UNSUPPORTED_MEDIA_TYPE",
				"Send the body as application/json.",
			);
		}

		if (error.status === 400) {
			return errorResponse(400, "INVALID_JSON", "The JSON sent is invalid.");
		}

		return error.getResponse();
	}

	const message = errorChainMessage(error);

	const trigger = triggerError(message);
	if (trigger) return trigger;

	if (/foreign key/i.test(message)) {
		return invalidReference(c.req.method);
	}

	if (/unique constraint/i.test(message)) {
		return errorResponse(
			409,
			"CONFLICT",
			"A record with that value already exists.",
		);
	}

	console.error(error);
	return errorResponse(
		500,
		"INTERNAL_ERROR",
		"Could not complete the operation.",
	);
}

export function isKnownErrorCode(code: string): boolean {
	return errorCodeSchema.safeParse(code).success;
}
