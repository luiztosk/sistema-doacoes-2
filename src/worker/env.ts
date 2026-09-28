import type { auth } from "./auth";

export type OrganizationContext = {
	id: string;
	memberId: string;
	role: string;
};

export type AppEnv = {
	Bindings: Env;
	Variables: {
		session: typeof auth.$Infer.Session | null;
		organization: OrganizationContext;
	};
};
