import {
	defineOpenAPIRoute,
	type RouteConfig,
	type RouteHandler,
} from "@hono/zod-openapi";
import type { auth } from "../../auth.config";

export type WorkerEnv = {
	Bindings: Env;
	Variables: {
		session: typeof auth.$Infer.Session | null;
	};
};

/**
 * O `Env` do Workers é o tipo das *bindings*, e o Hono espera o wrapper
 * `{ Bindings: Env }`. Sem este wrapper, `c.env` é `undefined` e o
 * `c.req.valid("json")` perde a tipagem do corpo.
 */
export function defineWorkerRoute<R extends RouteConfig>(def: {
	route: R;
	handler: RouteHandler<R, WorkerEnv>;
}) {
	return defineOpenAPIRoute(def);
}
