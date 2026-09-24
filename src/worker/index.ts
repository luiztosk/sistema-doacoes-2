import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { handleApiError } from "./api/errors";
import {
  DEVELOPMENT_ORGANIZATION_ID,
  temporaryOrganizationContext,
} from "./api/organization-context";
import { registerResources } from "./api/resources";
import type { AppEnvironment } from "./api/types";
import { createAuthHandler } from "./auth";
import { assistido } from "./db/schema";

export type { Env } from "./api/types";

const app = new Hono<AppEnvironment>();

app.all("/api/auth/*", async (c) => {
  const handler = createAuthHandler(c.env);
  return handler(c.req.raw);
});

const api = new Hono<AppEnvironment>();
api.use("*", temporaryOrganizationContext);
registerResources(api);
api.onError(handleApiError);
app.route("/api", api);

// Compatibility routes for the current prototype UI. New clients should use
// /api/assistidos and /api/assistidos/:id.
app.get("/api/", async (c) => {
  const db = drizzle(c.env.prod_sistema_doacoes_2);
  const assistidos = await db
    .select()
    .from(assistido)
    .where(eq(assistido.organizationId, DEVELOPMENT_ORGANIZATION_ID));
  return c.json({ assistidos });
});

app.get("/api/:id{[0-9]+}", async (c) => {
  const db = drizzle(c.env.prod_sistema_doacoes_2);
  const result = await db
    .select()
    .from(assistido)
    .where(
      and(
        eq(assistido.id, c.req.param("id")),
        eq(assistido.organizationId, DEVELOPMENT_ORGANIZATION_ID),
      ),
    );
  return c.json({ assistidos: result });
});

app.onError(handleApiError);
app.notFound((c) =>
  c.json(
    { error: { code: "NOT_FOUND", message: "Rota não encontrada." } },
    404,
  ),
);

export default app;
