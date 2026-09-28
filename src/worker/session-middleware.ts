import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { createMiddleware } from "hono/factory";
import { auth } from "./auth";
import type { AppEnv } from "./env";

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	c.set("session", session);

	await next();
});

export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
	if (!c.get("session")) {
		throw new HTTPException(401);
	}

	await next();
};
