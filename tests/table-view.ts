import assert from "node:assert/strict";
import { paginationFromView, sortingFromView, sortingToView, tableViews, tableViewSchemaFor, viewForUrl } from "../src/react-app/lib/table-view";
import { compareText } from "../src/react-app/lib/text";

let checks = 0;
for (const path of Object.keys(tableViews) as (keyof typeof tableViews)[]) {
	const policy = tableViews[path];
	const schema = tableViewSchemaFor(path);
	const parsed = schema.parse({});
	assert.deepEqual(sortingFromView(parsed.sort, policy.sort), [{
		id: policy.sort.split(".")[0], desc: policy.sort.endsWith(".desc"),
	}]);
	assert.equal(viewForUrl({ ...parsed, sort: policy.sort }).sort, policy.sort);
	assert.equal(schema.parse({ sort: policy.sort }).sort, policy.sort);
	for (const sort of ["nome.asc", "details.asc", "name.ASC", "name.asc.extra", "", 42]) {
		assert.equal(schema.parse({ sort }).sort, undefined);
		checks++;
	}
	const custom = path === "/inventory/ledger" ? "seq.asc" : `${policy.columns[0]}.desc`;
	const fromLink = schema.parse({ page: "2", pageSize: "10", sort: custom });
	assert.deepEqual(paginationFromView(fromLink), { pageIndex: 2, pageSize: 10 });
	assert.deepEqual(viewForUrl(fromLink), { page: 2, pageSize: 10, sort: custom });
	assert.equal(sortingToView(sortingFromView(fromLink.sort)), custom);
	assert.equal(sortingToView([], policy.sort), policy.sort);
	for (const value of [-1, 1.5, "abc", Infinity]) {
		assert.equal(schema.parse({ page: value }).page, undefined);
		assert.equal(schema.parse({ pageSize: value }).pageSize, undefined);
		checks += 2;
	}
	assert.equal(schema.parse({ pageSize: 0 }).pageSize, undefined);
	checks += 9;
}
assert.equal(tableViewSchemaFor("/inventory/ledger").parse({ sort: "seq.desc" }).sort, undefined);
assert.deepEqual(sortingFromView("name.asc.extra", "occurredAt.desc"), [{ id: "occurredAt", desc: true }]);
assert.deepEqual(paginationFromView({}), { pageIndex: 0, pageSize: 20 });
assert.deepEqual(viewForUrl({ page: 0, pageSize: 20, sort: "name.asc" }), { page: undefined, pageSize: undefined, sort: "name.asc" });
assert.deepEqual(["Zulu", "arroz 10", "Água", "arroz 2"].sort(compareText), ["Água", "arroz 2", "arroz 10", "Zulu"]);
checks += 5;
console.log(`OK: ${checks} assertions de ordenação e estado de tabela.`);
