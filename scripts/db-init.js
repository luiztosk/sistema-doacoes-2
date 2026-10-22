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

// Passo 5: seed (se remote, aponta a binding para o remoto temporariamente)
//
// O `getPlatformProxy()` resolve a binding D1 pelo wrangler.jsonc, e ele
// escreve no **local** por padrão. Para escrever no remoto, a binding
// precisa de `"remote": true` — e no arquivo a linha está comentada, como
// dica. Por isso o comento é **descomentado** em vez de procurado por
// texto: procurar por `"remote": true` encontra a linha comentada e
// acha que já está ligado, e o seed vai para o banco local sem avisar.
const wranglerPath = "wrangler.jsonc";
const original = readFileSync(wranglerPath, "utf8");

function apontarParaRemote(conteudo) {
	const comentado = /^(\s*)\/\/\s*"remote": true,\s*$/m;

	if (comentado.test(conteudo)) {
		return conteudo.replace(comentado, '$1"remote": true,');
	}

	if (/^\s*"remote": true,/m.test(conteudo)) {
		return conteudo;
	}

	return conteudo.replace(
		/"binding": "prod_sistema_doacoes_2",/,
		'"binding": "prod_sistema_doacoes_2",\n\t\t\t"remote": true,',
	);
}

if (remote) {
	writeFileSync(wranglerPath, apontarParaRemote(original));
	console.log("[seed] wrangler.jsonc apontado para o remoto.");
}

try {
	run("bun", ["run", "db-seed"]);
} finally {
	if (remote) {
		writeFileSync(wranglerPath, original);
		console.log("[seed] wrangler.jsonc restaurado.");
	}
}

console.log("DB init concluido (modo:", mode + (force ? ", force" : ""), ").");
