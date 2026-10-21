#!/usr/bin/env bun

import { spawnSync } from "child_process";
import { writeFileSync } from "fs";

/**
 * Zera um banco D1: derruba **todas** as tabelas, inclusive a de
 * bookkeeping `d1_migrations`, para que as migrations voltem a ser aplicadas
 * do zero.
 *
 * A ordem de derrubar importa, porque o D1 **recusa** `DROP TABLE` de uma
 * tabela que outra referencia — e a recusa sai como erro, não como aviso. Por
 * isso a ordem sai do **schema do próprio banco**: os filhos primeiro, os pais
 * depois. Ler o schema de verdade, e não o do Drizzle, também limpa tabela que
 * o código já não conhece.
 */

const remoto = process.argv.includes("--remote");
const alvo = remoto ? "--remote" : "--local";
const banco = "prod-sistema-doacoes-2";

function executar(args: string[]): string {
	const resultado = spawnSync("npx", args, {
		encoding: "utf-8",
		maxBuffer: 32 * 1024 * 1024,
	});

	if (resultado.status !== 0) {
		console.error(resultado.stderr || resultado.stdout);
		process.exit(resultado.status || 1);
	}

	return resultado.stdout;
}

const leitura = executar([
	"wrangler",
	"d1",
	"execute",
	banco,
	alvo,
	"--json",
	"--command",
	"SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite%' AND name NOT LIKE '_cf%'",
]);

const linhas = JSON.parse(leitura) as {
	results: { name: string; sql: string }[];
}[];

const tabelas = (linhas[0]?.results ?? [])
	.filter((linha) => linha.name !== "d1_migrations" && linha.sql);

const referenciadas = new Map<string, string[]>();

for (const tabela of tabelas) {
	const pais = [...tabela.sql.matchAll(/REFERENCES\s+`?(\w+)`?/g)].map(
		(achado) => achado[1],
	);
	referenciadas.set(tabela.name, pais);
}

const filhosDe = (nome: string) =>
	tabelas
		.filter((outra) => outra.name !== nome)
		.filter((outra) => referenciadas.get(outra.name)?.includes(nome))
		.map((outra) => outra.name);

const pendentes = new Set(tabelas.map((tabela) => tabela.name));
const ordem: string[] = [];

while (pendentes.size > 0) {
	const pronto = [...pendentes].filter((nome) =>
		filhosDe(nome).every((filho) => !pendentes.has(filho)),
	);

	if (pronto.length === 0) {
		throw new Error("ciclo de foreign keys — a ordem do DROP nao fecha");
	}

	for (const nome of pronto) {
		ordem.push(nome);
		pendentes.delete(nome);
	}
}

const sql = `${ordem
	.map((nome) => `DROP TABLE IF EXISTS \`${nome}\`;`)
	.join("\n")}\nDROP TABLE IF EXISTS \`d1_migrations\`;\n`;

const destino = "scripts/.wipe.sql";
writeFileSync(destino, sql);

const resultado = spawnSync(
	"npx",
	["wrangler", "d1", "execute", banco, alvo, `--file=${destino}`],
	{ stdio: "inherit" },
);

spawnSync("rm", ["-f", destino]);

if (resultado.status !== 0) {
	console.error("falha ao limpar o banco");
	process.exit(resultado.status || 1);
}

console.log(`banco limpo: ${ordem.length} tabelas + d1_migrations`);
