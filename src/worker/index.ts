import { inventoryItemRoutes, inventoryCategoryRoutes, donationRoutes, deliveryRoutes, inventoryCountRoutes, inventoryAdjustmentRoutes } from "./routes/inventory";
import { beneficiaryRoutes, donorRoutes } from "./routes/contacts";
import { auth } from "../auth.config";
import { requireSession, sessionMiddleware } from "./session-middleware";
import { OpenAPIHono } from "@hono/zod-openapi";

const app = new OpenAPIHono<{ 
	Bindings: Env 
	Variables: { session: typeof auth.$Infer.Session | null };
}>();

app.all("/api/auth/*", async (c) => {
	return auth.handler(c.req.raw);
});

app.use("/api/v1/*", sessionMiddleware, requireSession);

app.openapiRoutes([
  ...inventoryItemRoutes,
  ...inventoryCategoryRoutes,
  ...donationRoutes,
  ...deliveryRoutes,
  ...inventoryCountRoutes,
  ...inventoryAdjustmentRoutes,
  ...beneficiaryRoutes,
  ...donorRoutes
] as const);

// app.onError(handleApiError);
// app.notFound((c) =>
// 	c.json({ error: { code: "NOT_FOUND", message: "Rota não encontrada." } }, 404),
// );
app.doc('/api/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Inventory Items API',
    version: '1.0.0',
  },

})

export default app;
