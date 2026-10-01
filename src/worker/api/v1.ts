import type { Hono } from "hono";
import {
	assistido,
	assistidoInsertSchema,
	assistidoUpdateSchema,
	doador,
	doadorInsertSchema,
	doadorUpdateSchema,
} from "../db/schema";
import type { ApiBindings } from "./resource";
import { registerResource } from "./resource";
import { registerStock } from "./stock";

export function registerResources(app: Hono<ApiBindings>) {
	registerResource(app, {
		table: assistido,
		path: "assistidos",
		name: "Assistido",
		schemas: { insert: assistidoInsertSchema, update: assistidoUpdateSchema },
	});

	registerResource(app, {
		table: doador,
		path: "doadores",
		name: "Doador",
		schemas: { insert: doadorInsertSchema, update: doadorUpdateSchema },
	});

	registerStock(app);
}
