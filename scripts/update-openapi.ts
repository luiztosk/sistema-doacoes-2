#!/usr/bin/env node
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const PORT = 5173;
const DEV_URL = `http://localhost:${PORT}`;

function waitForServer(url: string, timeout = 30000): Promise<void> {
	const start = Date.now();
	return new Promise((resolve, reject) => {
		const check = async () => {
			try {
				const res = await fetch(url);
				if (res.ok) {
					resolve();
					return;
				}
			} catch {
				// server not ready
			}
			if (Date.now() - start > timeout) {
				reject(new Error("Server startup timeout"));
				return;
			}
			setTimeout(check, 500);
		};
		check();
	});
}

async function main() {
	console.log("Starting dev server...");
	const dev = spawn("npm", ["run", "dev"], {
		stdio: ["ignore", "pipe", "inherit"],
		detached: false,
	});

	let devReady = false;
	dev.stdout?.on("data", (data) => {
		const output = data.toString();
		if (output.includes("ready in") || output.includes("Local:") || output.includes("Network:")) {
			devReady = true;
		}
	});

	// Wait for server to be ready
	await new Promise((resolve) => {
		const check = setInterval(() => {
			if (devReady) {
				clearInterval(check);
				resolve(undefined);
			}
		}, 200);
		// fallback timeout
		setTimeout(() => {
			clearInterval(check);
			resolve(undefined);
		}, 10000);
	});

	// Wait for actual HTTP response
	await waitForServer(`${DEV_URL}/api/openapi.json`);
	console.log("Server ready, fetching OpenAPI spec...");

	try {
		const res = await fetch(`${DEV_URL}/api/openapi.json`);
		if (!res.ok) {
			throw new Error(`Failed to fetch OpenAPI spec: ${res.status}`);
		}
		const spec = await res.json();
		writeFileSync("./openapi.json", JSON.stringify(spec, null, 2));
		console.log("Saved openapi.json");

		// Generate types
		const { spawnSync } = await import("node:child_process");
		const result = spawnSync("npx", ["openapi-typescript", "./openapi.json", "-o", "./src/schemas/openapi/schema.d.ts"], {
			stdio: "inherit",
		});
		if (result.status !== 0) {
			throw new Error("openapi-typescript failed");
		}
		console.log("Generated src/schemas/openapi/schema.d.ts");
	} finally {
		dev.kill("SIGTERM");
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});