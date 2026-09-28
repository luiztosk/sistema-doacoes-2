import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { createMiddleware } from "hono/factory";
import { apiError } from "./api/errors";
import { member } from "./db/auth-schema";
import type { AppEnv } from "./env";

export const requireOrganization = createMiddleware<AppEnv>(async (c, next) => {
	const session = c.get("session");
	const organizationId = session?.session.activeOrganizationId;

	if (!organizationId) {
		throw apiError(
			403,
			"ORGANIZATION_REQUIRED",
			"Select an active organization before accessing this resource.",
		);
	}

	const db = drizzle(c.env.prod_sistema_doacoes_2);
	const [membership] = await db
		.select({ id: member.id, role: member.role })
		.from(member)
		.where(
			and(
				eq(member.organizationId, organizationId),
				eq(member.userId, session.user.id),
			),
		)
		.limit(1);

	if (!membership) {
		throw apiError(
			403,
			"ORGANIZATION_FORBIDDEN",
			"You are not a member of the active organization.",
		);
	}

	c.set("organization", {
		id: organizationId,
		memberId: membership.id,
		role: membership.role,
	});

	await next();
});
