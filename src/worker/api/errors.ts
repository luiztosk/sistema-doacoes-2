import type { Context } from "hono";

export type ApiErrorStatus = 400 | 404 | 409 | 415;

export class ApiError extends Error {
	constructor(
		public readonly status: ApiErrorStatus,
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
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

export function handleApiError(error: Error, c: Context) {
	if (error instanceof ApiError) {
		return c.json(
			{ error: { code: error.code, message: error.message } },
			error.status,
		);
	}

	if (
		/constraint failed|foreign key|unique constraint/i.test(
			errorChainMessage(error),
		)
	) {
		return c.json(
			{
				error: {
					code: "CONFLICT",
					message: "A operação conflita com dados relacionados.",
				},
			},
			409,
		);
	}

	console.error(error);
	return c.json(
		{
			error: {
				code: "INTERNAL_ERROR",
				message: "Não foi possível concluir a operação.",
			},
		},
		500,
	);
}
