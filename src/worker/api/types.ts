import type { D1Database } from "@cloudflare/workers-types";

export type Env = {
	prod_sistema_doacoes_2: D1Database;
};

export type AppEnvironment = {
	Bindings: Env;
	Variables: {
		organizationId: string;
	};
};
