import { OpenAPIHono } from "@hono/zod-openapi";
import type { z } from "zod";
import type { auth } from "../auth.config";
import {
	apiError,
	apiErrorResponse,
	errorFromIssue,
	isJsonObject,
} from "./api/errors";

export type AppEnv = {
	Bindings: Env;
	Variables: {
		session: typeof auth.$Infer.Session | null;
	};
};

/**
 * O app é criado aqui e as rotas se registram nele, porque o registro de
 * schemas nomeados do OpenAPI mora no app — e a rota precisa do schema
 * registrado no momento em que é definida.
 */
export const app = new OpenAPIHono<AppEnv>({
	defaultHook: (result) => {
		if (result.success) return undefined;

		const failure = result as { error: z.ZodError; data?: unknown };
		const body = result.target === "json" ? failure.data : undefined;

		if (isJsonObject(body) && "id" in body) {
			return apiErrorResponse(
				apiError(400, "READ_ONLY_FIELD", "Field 'id' is set by the server."),
			);
		}

		return apiErrorResponse(errorFromIssue(failure.error.issues[0], body));
	},
});

app.notFound((c) =>
	c.json(
		{
			error: {
				code: "NOT_FOUND",
				message: "Route not found.",
			},
		},
		404,
	),
);
