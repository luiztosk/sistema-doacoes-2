import { Hono } from "hono";
import { handleApiError } from "./api/errors";
import { registerResources } from "./api/v1";
import { auth } from "./auth";
import { requireSession, sessionMiddleware } from "./session-middleware";

const app = new Hono<{
	Variables: { session: typeof auth.$Infer.Session | null };
}>();

app.all("/api/auth/*", async (c) => {
	return auth.handler(c.req.raw);
});

app.use("/api/v1/*", sessionMiddleware, requireSession);

const api = new Hono<{ Bindings: Env }>();
registerResources(api);
app.route("/api/v1", api);

app.onError(handleApiError);
app.notFound((c) =>
	c.json({ error: { code: "NOT_FOUND", message: "Rota não encontrada." } }, 404),
);

export default app;
