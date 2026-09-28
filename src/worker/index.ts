import { Hono } from "hono";
import { handleApiError } from "./api/errors";
import { registerResources } from "./api/v1";
import { auth } from "./auth";
import type { AppEnv } from "./env";
import { requireOrganization } from "./organization-middleware";
import { requireSession, sessionMiddleware } from "./session-middleware";

const app = new Hono<AppEnv>();

app.all("/api/auth/*", async (c) => {
	return auth.handler(c.req.raw);
});

app.use(
	"/api/v1/*",
	sessionMiddleware,
	requireSession,
	requireOrganization,
);

const api = new Hono<AppEnv>();
registerResources(api);
app.route("/api/v1", api);

app.onError(handleApiError);
app.notFound((c) =>
	c.json({ error: { code: "NOT_FOUND", message: "Rota não encontrada." } }, 404),
);

export default app;
