import { auth } from "../auth.config";
import { app } from "./app";
import { handleApiError } from "./api/errors";
import { openApiConfig } from "./openapi";
import { apiRoutes } from "./routes";
import { requireSession, sessionMiddleware } from "./session-middleware";

app.use("/api/v1/*", sessionMiddleware, requireSession);

app.openapiRoutes(apiRoutes);

app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

app.onError(handleApiError);

app.doc31("/api/openapi.json", openApiConfig);

export default app;
