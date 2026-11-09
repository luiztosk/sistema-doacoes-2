import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { fkOptions } from "../src/react-app/lib/fk-factory";
import { matchesOption, selectedOption, sortOptions } from "../src/react-app/lib/select-options";
import { donationCreateSchema } from "../src/schemas/api/donation";
import { deliveryCreateSchema } from "../src/schemas/api/delivery";

const options = Object.freeze([
	Object.freeze({ value: "00000000-0000-4000-8000-000000000001", label: "Zebra" }),
	Object.freeze({ value: "00000000-0000-4000-8000-000000000002", label: "Açúcar" }),
	Object.freeze({ value: "00000000-0000-4000-8000-000000000003", label: "arroz 10" }),
	Object.freeze({ value: "00000000-0000-4000-8000-000000000004", label: "Arroz 2" }),
]);
let checks = 0;
for (const [query, expected] of [
	["aCuCaR", ["Açúcar"]],
	["AÇÚCAR", ["Açúcar"]],
	["cu\u0327car", ["Açúcar"]],
	["RROZ", ["Arroz 2", "arroz 10"]],
	["inexistente", []],
	["", ["Açúcar", "Arroz 2", "arroz 10", "Zebra"]],
] as const) {
	assert.deepEqual(sortOptions(options).filter((option) => matchesOption(option, query)).map((option) => option.label), expected);
	checks++;
}
assert.equal(options[0].label, "Zebra");
assert.notEqual(sortOptions(options), options);
assert.deepEqual(sortOptions([]), []);
assert.equal(selectedOption([], null), null);
assert.equal(selectedOption([], ""), null);
assert.deepEqual(selectedOption([], options[1].value), { value: options[1].value, label: options[1].value });
assert.equal(selectedOption(options, options[1].value), options[1]);
assert.equal(selectedOption(sortOptions(options), options[1].value)?.value, options[1].value);
assert.deepEqual(fkOptions([{ id: "id-original", name: "Nome legível" }]), [{ value: "id-original", label: "Nome legível" }]);
assert.deepEqual(fkOptions(), []);
checks += 10;

const sameLabels = [{ value: "id-1", label: "Ana" }, { value: "id-2", label: "Ana" }];
assert.equal(selectedOption(sameLabels, "id-2")?.value, "id-2");
checks++;

const catalog = JSON.parse(readFileSync(new URL("../mock_data/catalogo.json", import.meta.url), "utf8")) as { items: { name: string }[] }[];
const records = catalog.flatMap((group, groupIndex) => group.items.map((item, itemIndex) => ({ id: `${groupIndex}-${itemIndex}`, name: item.name })));
const catalogOptions = fkOptions(records);
assert.equal(catalogOptions.length, 130);
assert.ok(catalogOptions.some((option) => matchesOption(option, "arroz")));
assert.ok(catalogOptions.some((option) => matchesOption(option, "ACUCAR")));
assert.deepEqual(new Set(sortOptions(catalogOptions).map((option) => option.value)), new Set(records.map((record) => record.id)));
checks += 4;
for (const record of records) {
	assert.ok(matchesOption(catalogOptions.find((option) => option.value === record.id)!, record.name.toUpperCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")));
	checks++;
}

const selected = selectedOption(options, options[1].value)!;
const common = { occurredAt: "2026-10-23T12:00:00Z", items: [{ itemId: selected.value, quantity: 3 }] };
const donation = donationCreateSchema.parse({ ...common, donorId: options[0].value });
const delivery = deliveryCreateSchema.parse({ ...common, beneficiaryId: options[0].value });
assert.deepEqual(donation.items, [{ itemId: options[1].value, quantity: 3 }]);
assert.deepEqual(delivery.items, donation.items);
assert.equal(donationCreateSchema.safeParse({ ...common, donorId: "Zebra" }).success, false);
assert.equal(deliveryCreateSchema.safeParse({ ...common, beneficiaryId: "Zebra" }).success, false);
checks += 4;
console.log(`OK: ${checks} assertions de busca, ordenação e IDs dos selects.`);
