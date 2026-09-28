import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { castCsvValue } from "../src/worker/db/seed-csv";

type CsvRow = Record<string, unknown>;

function readCsv(name: string): CsvRow[] {
	return parse(
		fs.readFileSync(path.join("mock_data", `${name}.csv`), "utf8"),
		{
			columns: true,
			skip_empty_lines: true,
			cast: castCsvValue,
		},
	) as CsvRow[];
}

function byId(rows: CsvRow[]) {
	return new Map(rows.map((row) => [String(row.id), row]));
}

const assistidos = readCsv("assistido");
const doadores = readCsv("doador");
const categorias = readCsv("categoria_item");
const nomes = readCsv("nome_item");
const coletas = readCsv("coleta");
const entregas = readCsv("entrega");
const itens = readCsv("item");

assert.equal(castCsvValue("True", {}), true);
assert.equal(castCsvValue("False", {}), false);
assert.equal(castCsvValue("", { quoting: false }), null);
assert.ok(castCsvValue("2026-09-28T12:00:00Z", { column: "dataHora" }) instanceof Date);
console.log("ok   conversões do CSV preservam booleanos, nulos e datas");

const booleanFields = [
	"doentes",
	"bolsaFamilia",
	"aposentado",
	"pensao",
	"cestaBasica",
	"atividadeRemunerada",
	"criancaEscola",
];
for (const row of assistidos) {
	for (const field of booleanFields) {
		assert.ok(
			typeof row[field] === "boolean" || row[field] === null,
			`${field} de assistido ${row.id} não virou boolean/null`,
		);
	}
}
console.log("ok   os sete campos booleanos de assistido são tipados corretamente");

const categoriaPorId = byId(categorias);
const doadorPorId = byId(doadores);
const assistidoPorId = byId(assistidos);
const nomePorId = byId(nomes);
const coletaPorId = byId(coletas);
const entregaPorId = byId(entregas);

for (const nome of nomes) {
	assert.equal(
		nome.organizationId,
		categoriaPorId.get(String(nome.categoriaId))?.organizationId,
	);
}
for (const coleta of coletas) {
	assert.equal(
		coleta.organizationId,
		doadorPorId.get(String(coleta.doadorId))?.organizationId,
	);
}
for (const entrega of entregas) {
	assert.equal(
		entrega.organizationId,
		assistidoPorId.get(String(entrega.assistidoId))?.organizationId,
	);
}
for (const item of itens) {
	assert.equal(
		item.organizationId,
		nomePorId.get(String(item.nomeId))?.organizationId,
	);

	const coleta = item.coletaId
		? coletaPorId.get(String(item.coletaId))
		: undefined;
	const entrega = item.entregaId
		? entregaPorId.get(String(item.entregaId))
		: undefined;

	if (coleta) assert.equal(item.organizationId, coleta.organizationId);
	if (entrega) assert.equal(item.organizationId, entrega.organizationId);
	if (item.coletaId) assert.notEqual(item.status, "AGUARDA_COLETA");
	if (item.entregaId) {
		assert.equal(item.status, "ENTREGUE");
		assert.ok(coleta?.dataHora instanceof Date);
		assert.ok(entrega?.dataHora instanceof Date);
		assert.ok(
			(entrega.dataHora as Date).getTime() >=
				(coleta.dataHora as Date).getTime(),
		);
	}
}
console.log("ok   referências do mock não atravessam organizações");
console.log("ok   status e datas dos itens seguem a ordem coleta → entrega");

console.log("\n4/4 verificações do seed passaram");
