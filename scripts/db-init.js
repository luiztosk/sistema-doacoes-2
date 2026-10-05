#!/usr/bin/env node

import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

console.warn("FORBIDDEN IN PRODUCTION — use with caution");

const args = process.argv.slice(2);
const local = args.includes("--local");
const remote = args.includes("--remote");
const force = args.includes("--force");

if (!local && !remote) {
	console.error("Uso: node scripts/db-init.js --local | --remote [--force]");
	process.exit(1);
}

if (local && remote) {
	console.error("Nao combine --local e --remote na mesma chamada.");
	process.exit(1);
}

const mode = remote ? "remote" : "local";
const flag = remote ? "--remote" : "--local";

if (force) {
	if (local) {
		console.log("[force] Limpando banco local...");
		try {
			const fs = await import("fs");
			const path = await import("path");
			const stateDir = ".wrangler/state/v3/d1";
			if (fs.existsSync(stateDir)) {
				for (const f of fs.readdirSync(stateDir)) {
					fs.rmSync(path.join(stateDir, f), { recursive: true, force: true });
				}
			}
		} catch (e) {
			console.error("Erro ao limpar local:", e.message);
		}
	} else {
		console.log("[force] Modo remote: migrations serao reaplicadas no remoto (destrutivo).");
	}
}

function run(cmd, argsArr) {
	console.log(`> ${cmd} ${argsArr.join(" ")}`);
	const result = spawnSync(cmd, argsArr, { stdio: "inherit", shell: true });
	if (result.status !== 0) {
		console.error(`Erro no comando: ${cmd}`);
		process.exit(result.status || 1);
	}
}

// Passo 1: auth schema
run("npm", ["run", "gen-auth"]);

// Passo 2: drizzle migrations
run("npm", ["run", "gen-drizzle"]);

// Passo 3: apply migrations
run("npx", ["wrangler", "d1", "migrations", "apply", "prod-sistema-doacoes-2", flag]);

// Passo 4: tipos
run("npm", ["run", "cf-typegen"]);

// Passo 5: seed (se remote, edita wrangler.jsonc temporariamente)
if (remote) {
	const wranglerPath = "wrangler.jsonc";
	const original = readFileSync(wranglerPath, "utf8");
	const modified = original.replace('"remote": true,', '"remote": true,');
	// Se nao tem remote: true, adiciona
	if (!original.includes('"remote": true')) {
		const updated = original.replace(
			'"binding": "prod_sistema_doacoes_2",',
			'"binding": "prod_sistema_doacoes_2",\n            "remote": true,'
		);
		writeFileSync(wranglerPath, updated);
		console.log("[seed] wrangler.jsonc atualizado para remote temporariamente.");
	}
}

run("npm", ["run", "db-seed"]);

if (remote) {
	// Restaura wrangler.jsonc removendo o remote: true adicionado
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
