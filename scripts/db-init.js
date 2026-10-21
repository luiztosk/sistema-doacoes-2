#!/usr/bin/env bun

import { spawnSync } from "child_process";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

console.warn("FORBIDDEN IN PRODUCTION — use with caution");

const args = process.argv.slice(2);
const local = args.includes("--local");
const remote = args.includes("--remote");
const force = args.includes("--force");

if (!local && !remote) {
	console.error("Uso: bun scripts/db-init.js --local | --remote [--force]");
	process.exit(1);
}

if (local && remote) {
	console.error("Nao combine --local e --remote na mesma chamada.");
	process.exit(1);
}

const mode = remote ? "remote" : "local";
const flag = remote ? "--remote" : "--local";

if (force && local) {
	console.log("[force] Limpando banco local...");
	const stateDir = ".wrangler/state/v3/d1";
	if (existsSync(stateDir)) {
		for (const file of readdirSync(stateDir)) {
			rmSync(join(stateDir, file), { recursive: true, force: true });
		}
	}
}

if (force && remote) {
	console.log("[force] Modo remote: o banco sera apagado e recriado (destrutivo).");
	run("bun", ["run", "db-wipe", "--remote"]);
}

function run(cmd, argsArr) {
	console.log(`> ${cmd} ${argsArr.join(" ")}`);
	const result = spawnSync(cmd, argsArr, { stdio: "inherit" });
	if (result.status !== 0) {
		console.error(`Erro no comando: ${cmd}`);
		process.exit(result.status || 1);
	}
}

// Passo 1: auth schema
run("bun", ["run", "gen-auth"]);

// Passo 2: drizzle migrations
run("bun", ["run", "gen-drizzle"]);

// Passo 3: apply migrations
run("npx", [
	"wrangler",
	"d1",
	"migrations",
	"apply",
	"prod-sistema-doacoes-2",
	flag,
]);

// Passo 4: tipos
run("bun", ["run", "cf-typegen"]);

// Passo 5: seed (se remote, edita wrangler.jsonc temporariamente)
if (remote) {
	const wranglerPath = "wrangler.jsonc";
	const original = readFileSync(wranglerPath, "utf8");

	if (!original.includes('"remote": true')) {
		const updated = original.replace(
			'"binding": "prod_sistema_doacoes_2",',
			'"binding": "prod_sistema_doacoes_2",\n            "remote": true,',
		);
		writeFileSync(wranglerPath, updated);
		console.log("[seed] wrangler.jsonc atualizado para remote temporariamente.");
	}
}

run("bun", ["run", "db-seed"]);

if (remote) {
	const wranglerPath = "wrangler.jsonc";
	const content = readFileSync(wranglerPath, "utf8");
	const restored = content.replace(
		/"binding": "prod_sistema_doacoes_2",\n\s*"remote": true,/,
		'"binding": "prod_sistema_doacoes_2",',
	);
	writeFileSync(wranglerPath, restored);
	console.log("[seed] wrangler.jsonc restaurado.");
}

console.log("DB init concluido (modo:", mode + (force ? ", force" : ""), ").");
