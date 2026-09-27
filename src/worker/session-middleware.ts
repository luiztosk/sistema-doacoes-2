import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { createMiddleware } from "hono/factory";
import { auth } from "./auth";

type SessionEnv = {
	Variables: {
		session: typeof auth.$Infer.Session | null;
	};
};

export const sessionMiddleware = createMiddleware<SessionEnv>(async (c, next) => {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	c.set("session", session);

	await next();
});

export const requireSession: MiddlewareHandler<SessionEnv> = async (c, next) => {
	if (!c.get("session")) {
		throw new HTTPException(401);
	}

	await next();
};
