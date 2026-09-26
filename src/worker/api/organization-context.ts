import type { MiddlewareHandler } from "hono";
import type { AppEnvironment } from "./types";

// Temporary development organization while issue #13 (authenticated organization
// context) is blocked by the Better Auth integration. Clients cannot override it.
export const DEVELOPMENT_ORGANIZATION_ID = "org-1";

export const temporaryOrganizationContext: MiddlewareHandler<
	AppEnvironment
> = async (c, next) => {
	c.set("organizationId", DEVELOPMENT_ORGANIZATION_ID);
	await next();
};
