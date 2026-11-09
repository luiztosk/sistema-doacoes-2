import assert from "node:assert/strict";

import { compareDates, formatDate, formatPhone } from "../src/react-app/lib/format";

const dateCases = [
	{
		name: "data no formato brasileiro",
		value: "2026-10-01T12:00:00.000Z",
		timeZone: "America/Sao_Paulo",
		expected: "01/10/2026",
	},
	{
		name: "virada de dia no fuso de quem lê",
		value: "2026-10-01T01:30:00.000Z",
		timeZone: "America/Sao_Paulo",
		expected: "30/09/2026",
	},
	{
		name: "mesmo instante em UTC",
		value: "2026-10-01T01:30:00.000Z",
		timeZone: "UTC",
		expected: "01/10/2026",
	},
	{
		name: "offset explícito respeitado",
		value: "2026-10-01T00:30:00+02:00",
		timeZone: "America/Sao_Paulo",
		expected: "30/09/2026",
	},
	{
		name: "ano bissexto",
		value: "2024-02-29T12:00:00Z",
		timeZone: "America/Sao_Paulo",
		expected: "29/02/2024",
	},
	{
		name: "outro fuso de leitura",
		value: "2026-09-30T23:30:00Z",
		timeZone: "Asia/Tokyo",
		expected: "01/10/2026",
	},
	{ name: "data nula", value: null, timeZone: "UTC", expected: "—" },
	{ name: "data ausente", value: undefined, timeZone: "UTC", expected: "—" },
	{ name: "data vazia", value: "", timeZone: "UTC", expected: "—" },
	{ name: "data inválida", value: "inválida", timeZone: "UTC", expected: "—" },
];

const phoneCases = [
	{ name: "celular brasileiro", value: "+5511999999999", expected: "(11) 99999-9999" },
	{ name: "telefone fixo", value: "+551132345678", expected: "(11) 3234-5678" },
	{ name: "outro DDD", value: "+5521987654321", expected: "(21) 98765-4321" },
	{ name: "telefone nulo", value: null, expected: "—" },
	{ name: "telefone ausente", value: undefined, expected: "—" },
	{ name: "telefone vazio", value: "", expected: "—" },
	{ name: "número internacional preservado", value: "+14155552671", expected: "+14155552671" },
	{ name: "número brasileiro incompleto preservado", value: "+5511999", expected: "+5511999" },
	{ name: "número brasileiro longo preservado", value: "+55119999999999", expected: "+55119999999999" },
	{ name: "valor já formatado preservado", value: "(11) 99999-9999", expected: "(11) 99999-9999" },
];

const cases: { name: string; run: () => void }[] = [
	...dateCases.map(({ name, value, timeZone, expected }) => ({
		name,
		run: () => assert.equal(formatDate(value, timeZone), expected),
	})),
	...phoneCases.map(({ name, value, expected }) => ({
		name,
		run: () => assert.equal(formatPhone(value), expected),
	})),
	{
		name: "data usa o fuso local por padrão",
		run: () => {
			const value = "2026-10-01T01:30:00Z";
			const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			assert.equal(formatDate(value), formatDate(value, timeZone));
		},
	},
	{
		name: "ordenação cronológica entre meses, não pela exibição",
		run: () => {
			const values = ["2026-10-01T12:00:00Z", "2026-09-30T12:00:00Z"];
			assert.deepEqual([...values].sort(compareDates), [values[1], values[0]]);
		},
	},
	{
		name: "ordenação considera offsets, não a ordem textual do ISO",
		run: () => {
			const earlier = "2026-10-01T01:00:00+02:00";
			const later = "2026-10-01T00:00:00Z";
			assert.ok(compareDates(earlier, later) < 0);
			assert.ok(compareDates(later, earlier) > 0);
		},
	},
	{
		name: "instantes equivalentes com offsets diferentes",
		run: () => assert.equal(
			compareDates("2026-10-01T00:00:00Z", "2026-09-30T21:00:00-03:00"),
			0,
		),
	},
	{
		name: "comparação defensiva de data inválida",
		run: () => assert.equal(compareDates("inválida", "2026-10-01T00:00:00Z"), 0),
	},
	{
		name: "formatação não altera o payload",
		run: () => {
			const record = Object.freeze({
				phone: "+5511999999999",
				occurredAt: "2026-10-01T12:00:00.000Z",
			});
			const original = JSON.stringify(record);
			formatPhone(record.phone);
			formatDate(record.occurredAt);
			assert.equal(JSON.stringify(record), original);
		},
	},
];

let failures = 0;
for (const { name, run } of cases) {
	try {
		run();
		console.log(`ok   ${name}`);
	} catch (error) {
		failures += 1;
		console.error(`FALHA ${name}`, error);
	}
}

console.log(`\n${cases.length - failures}/${cases.length} testes de formatação passaram`);
process.exitCode = failures === 0 ? 0 : 1;
