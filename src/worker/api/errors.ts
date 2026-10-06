import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";

export type ApiErrorStatus = 400 | 404 | 409 | 415;

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(
	status: ApiErrorStatus | 500,
	code: string,
	message: string,
): Response {
	return Response.json({ error: { code, message } }, { status });
}

export function apiError(
	status: ApiErrorStatus,
	code: string,
	message: string,
): HTTPException {
	return new HTTPException(status, { res: errorResponse(status, code, message) });
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

function invalidValue(field: string) {
	return apiError(400, "INVALID_VALUE", `${field}has an invalid value.`);
}

function errorFromIssue(issue: z.core.$ZodIssue, body: JsonObject): HTTPException {
	const path = typeof issue.path[0] === "string" ? issue.path[0] : undefined;
	const field = path === undefined ? "" : `Field '${path}' `;
	const detail = issue as unknown as Record<string, unknown>;

	switch (issue.code) {
		case "unrecognized_keys": {
			const [key] = detail.keys as string[];
			return apiError(
				400,
				"UNKNOWN_FIELD",
				`Field '${key}' is not accepted in this resource.`,
			);
		}

		case "invalid_type": {
			if (path !== undefined && body[path] == null) {
				return apiError(
					400,
					"REQUIRED_FIELD",
					`Field '${path}' is required.`,
				);
			}
			return invalidValue(field);
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

		case "custom":
			return apiError(400, "INVALID_VALUE", `${field}${issue.message}`);

		default:
			return invalidValue(field);
	}
}

export function parseBody<TPayload>(
	body: JsonObject,
	schema: z.ZodType<TPayload>,
	mode: "create" | "update",
): TPayload {
	// if ("id" in body) {
	// 	throw apiError(400, "READ_ONLY_FIELD", "Field 'id' is set by the server.");
	// }

	if (mode === "update" && Object.keys(body).length === 0) {
		throw apiError(400, "EMPTY_UPDATE", "Send at least one field to update.");
	}

	const parsed = schema.safeParse(body);
	if (parsed.success) {
		return parsed.data;
	}

	throw errorFromIssue(parsed.error.issues[0], body);
}

function errorChainMessage(error: Error): string {
	const messages: string[] = [];
	let current: unknown = error;

	for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
		messages.push(current.message);
		current = (current as Error & { cause?: unknown }).cause;
	}

	return messages.join(" ");
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
	if (error instanceof HTTPException) {
		return error.getResponse();
	}

	const message = errorChainMessage(error);

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
