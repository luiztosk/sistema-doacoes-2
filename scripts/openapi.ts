#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { app } from "../src/worker/app";
import { openApiConfig } from "../src/worker/openapi";
import { apiRoutes } from "../src/worker/routes";

/**
 * O `openapi.json` é gerado do contrato em zod, e o contrato não depende do
 * runtime do Worker — por isso o documento sai daqui, sem subir servidor.
 */
app.openapiRoutes(apiRoutes);

const document = app.getOpenAPI31Document(openApiConfig);

writeFileSync("./openapi.json", JSON.stringify(document, null, 2));
console.log("Saved openapi.json");

const result = spawnSync(
	"npx",
	[
		"openapi-typescript",
		"./openapi.json",
		"-o",
		"./src/schemas/openapi/schema.d.ts",
	],
	{ stdio: "inherit" },
);

if (result.status !== 0) {
	console.error("openapi-typescript failed");
	process.exit(result.status ?? 1);
}

console.log("Generated src/schemas/openapi/schema.d.ts");
