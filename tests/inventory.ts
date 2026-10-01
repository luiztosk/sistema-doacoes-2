import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import { getPlatformProxy } from "wrangler";
import { handleApiError } from "../src/worker/api/errors";
import { registerResources } from "../src/worker/api/v1";

const app = new Hono<{ Bindings: Env }>();
const api = new Hono<{ Bindings: Env }>();
registerResources(api);
app.route("/api/v1", api);
app.onError(handleApiError);

const { env, dispose } = await getPlatformProxy<{
	prod_sistema_doacoes_2: D1Database;
}>();

const db = env.prod_sistema_doacoes_2;

let failures = 0;

function check(nome: string, ok: boolean, detail = "") {
	if (ok) {
		console.log(`ok   ${nome}`);
		return;
	}
	failures += 1;
	console.log(`FALHA ${nome}${detail ? ` — ${detail}` : ""}`);
}

function igual(nome: string, esperado: unknown, recebido: unknown) {
	const ok = JSON.stringify(esperado) === JSON.stringify(recebido);
	check(
		nome,
		ok,
		ok
			? ""
			: `esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(recebido)}`,
	);
}

type CorpoResposta = {
	data?: { id?: string; status?: string; [chave: string]: unknown };
	error?: { code?: string; message?: string };
};

type Resposta = { status: number; body: CorpoResposta | null };

async function chamar(
	metodo: string,
	path: string,
	body?: unknown,
): Promise<Resposta> {
	const res = await app.request(
		path,
		{
			method: metodo,
			headers: { "content-type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
		},
		env as never,
	);

	const texto = await res.text();
	return { status: res.status, body: texto ? JSON.parse(texto) : null };
}

async function consultar<T = Record<string, unknown>>(
	sql: string,
	bindings: unknown[] = [],
): Promise<T[]> {
	const result = await db
		.prepare(sql)
		.bind(...bindings)
		.all<T>();
	return result.results;
}

async function stock(itemId: string) {
	const rows = await consultar<{
		on_hand: number;
		reserved_quantity: number;
		available: number;
	}>(
		`SELECT on_hand, reserved_quantity, available FROM inventory_item WHERE id = ?1`,
		[itemId],
	);
	return rows[0];
}

async function invariantes(rotulo: string) {
	const fora = await consultar(
		`SELECT id FROM inventory_item
		 WHERE on_hand < 0 OR reserved_quantity < 0 OR reserved_quantity > on_hand`,
	);
	check(
		`${rotulo}: nenhum contador negativo ou acima do físico`,
		fora.length === 0,
		JSON.stringify(fora),
	);

	const divergentes = await consultar(
		`SELECT i.id, i.reserved_quantity, COALESCE(SUM(dl.quantity), 0) AS esperado
		 FROM inventory_item i
		 LEFT JOIN delivery_line dl
		   ON dl.inventory_item_id = i.id
		  AND EXISTS (SELECT 1 FROM delivery d WHERE d.id = dl.delivery_id AND d.status = 'OPEN')
		 GROUP BY i.id
		 HAVING i.reserved_quantity != COALESCE(SUM(dl.quantity), 0)`,
	);
	check(
		`${rotulo}: reserved_quantity bate com as reservas abertas`,
		divergentes.length === 0,
		JSON.stringify(divergentes),
	);
}

const ANCHORS = {
	items: `name LIKE 'check-item-%'`,
	categories: `name LIKE 'check-categoria-%'`,
	donations: `note = 'check'`,
	donors: `nome = 'Doador de teste'`,
	beneficiaries: `nome = 'Assistido de teste'`,
};

async function limpar() {
	const idsDe = async (sql: string) =>
		(await consultar<{ id: string }>(sql)).map((row) => row.id);

	const items = await idsDe(
		`SELECT id FROM inventory_item WHERE ${ANCHORS.items}`,
	);
	const categories = await idsDe(
		`SELECT id FROM item_category WHERE ${ANCHORS.categories}`,
	);
	const donors = await idsDe(`SELECT id FROM doador WHERE ${ANCHORS.donors}`);
	const beneficiaries = await idsDe(
		`SELECT id FROM assistido WHERE ${ANCHORS.beneficiaries}`,
	);
	const donations = await idsDe(
		`SELECT id FROM donation WHERE ${ANCHORS.donations}`,
	);
	const deliveries = await idsDe(
		`SELECT id FROM delivery WHERE beneficiary_id IN (SELECT id FROM assistido WHERE ${ANCHORS.beneficiaries})`,
	);
	const counts = await idsDe(
		`SELECT id FROM inventory_count WHERE counted_by = 'check'
		 OR id IN (SELECT count_id FROM inventory_count_line
		           WHERE inventory_item_id IN (SELECT id FROM inventory_item WHERE ${ANCHORS.items}))`,
	);

	const apagar = async (tableName: string, ids: string[]) => {
		for (const id of ids) {
			await db.prepare(`DELETE FROM ${tableName} WHERE id = ?1`).bind(id).run();
		}
	};

	const apagarFilhos = async (
		tableName: string,
		column: string,
		ids: string[],
	) => {
		if (ids.length === 0) return;
		const list = ids.map(() => "?").join(", ");
		await db
			.prepare(`DELETE FROM ${tableName} WHERE ${column} IN (${list})`)
			.bind(...ids)
			.run();
	};

	await apagarFilhos("delivery_line", "delivery_id", deliveries);
	await apagarFilhos("donation_line", "donation_id", donations);
	await apagarFilhos("inventory_count_line", "count_id", counts);
	await apagarFilhos("inventory_adjustment", "count_id", counts);
	await apagar("delivery", deliveries);
	await apagar("donation", donations);
	await apagar("inventory_count", counts);
	await apagarFilhos("inventory_adjustment", "inventory_item_id", items);
	await apagar("inventory_item", items);
	await db
		.prepare(
			`DELETE FROM inventory_count WHERE NOT EXISTS (
				SELECT 1 FROM inventory_count_line WHERE count_id = inventory_count.id)`,
		)
		.run();
	await apagar("item_category", categories);
	await apagar("doador", donors);
	await apagar("assistido", beneficiaries);
}

async function main() {
	await limpar();

	const now = new Date("2026-10-01T12:00:00Z").toISOString();

	const category = await chamar("POST", "/api/v1/item-categories", {
		name: `check-categoria-${Date.now()}`,
	});
	check(
		"categoria criada",
		category.status === 201,
		JSON.stringify(category.body),
	);
	const categoryId = category.body?.data?.id ?? "";

	const doador = await chamar("POST", "/api/v1/doadores", {
		nome: "Doador de teste",
	});
	const doadorId = doador.body?.data?.id ?? "";

	const assistido = await chamar("POST", "/api/v1/assistidos", {
		nome: "Assistido de teste",
	});
	const assistidoId = assistido.body?.data?.id ?? "";

	const itemIds: string[] = [];
	for (const nome of ["Arroz", "Feijao", "Oleo"]) {
		const item = await chamar("POST", "/api/v1/inventory-items", {
			name: `check-item-${nome}-${Date.now()}`,
			categoryId,
			unit: "KG",
		});
		check(
			`item ${nome} criado`,
			item.status === 201,
			JSON.stringify(item.body),
		);
		itemIds.push(item.body?.data?.id ?? "");
	}

	const [arroz, feijao, oleo] = itemIds;
	igual("item novo nasce com estoque zero", 0, (await stock(arroz)).on_hand);

	const rejectedCounter = await chamar("POST", "/api/v1/inventory-items", {
		name: `check-contador-${Date.now()}`,
		categoryId,
		unit: "KG",
		onHand: 500,
	});
	igual("POST de item com onHand é recusado", 400, rejectedCounter.status);

	const donation = await chamar("POST", "/api/v1/donations", {
		donorId: doadorId,
		occurredAt: now,
		note: "check",
		lines: [
			{ inventoryItemId: arroz, quantity: 10 },
			{ inventoryItemId: feijao, quantity: 20 },
		],
	});
	check(
		"doação criada em DRAFT",
		donation.status === 201 && donation.body?.data?.status === "DRAFT",
		JSON.stringify(donation.body),
	);
	const donationId = donation.body?.data?.id ?? "";

	igual("doação em DRAFT não mexe no estoque", 0, (await stock(arroz)).on_hand);

	const recebida = await chamar(
		"POST",
		`/api/v1/donations/${donationId}/receive`,
	);
	check(
		"doação recebida",
		recebida.status === 200 && recebida.body?.data?.status === "RECEIVED",
		JSON.stringify(recebida.body),
	);

	const afterRice = await stock(arroz);
	const afterBeans = await stock(feijao);
	igual("receber soma a quantidade no on_hand", 10, afterRice.on_hand);
	igual("available da column gerada", 10, afterRice.available);
	igual("segundo item creditado", 20, afterBeans.on_hand);

	const receberDuasVezes = await chamar(
		"POST",
		`/api/v1/donations/${donationId}/receive`,
	);
	igual(
		"receber duas vezes é transição inválida",
		400,
		receberDuasVezes.status,
	);
	igual("e não credita de novo", 10, (await stock(arroz)).on_hand);
	await invariantes("após receber");

	const delivery = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: now,
		lines: [{ inventoryItemId: arroz, quantity: 4 }],
	});
	check(
		"delivery criada e reservada",
		delivery.status === 201,
		JSON.stringify(delivery.body),
	);
	const deliveryId = delivery.body?.data?.id ?? "";

	const reserved = await stock(arroz);
	igual("reservar mexe só em reserved_quantity", 10, reserved.on_hand);
	igual("reserved_quantity subiu", 4, reserved.reserved_quantity);
	igual("available caiu sem o físico mudar", 6, reserved.available);
	const countBelowReserved = await chamar("POST", "/api/v1/inventory-counts", {
		occurredAt: now,
		lines: [{ inventoryItemId: arroz, countedQuantity: 1 }],
	});
	igual("contagem abaixo do reservado é 409", 409, countBelowReserved.status);
	igual(
		"com o código de estoque",
		"INSUFFICIENT_STOCK",
		countBelowReserved.body?.error?.code,
	);
	igual(
		"e a contagem recusada não mexeu no físico",
		10,
		(await stock(arroz)).on_hand,
	);

	await invariantes("após reservar");

	const withoutStock = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: now,
		lines: [
			{ inventoryItemId: arroz, quantity: 3 },
			{ inventoryItemId: oleo, quantity: 5 },
		],
	});
	igual("delivery sem estoque é 409", 409, withoutStock.status);
	igual(
		"com o código certo",
		"INSUFFICIENT_STOCK",
		withoutStock.body?.error?.code,
	);
	check(
		"a mensagem diz quantos itens faltam",
		withoutStock.body?.error?.message ===
			"One of the items does not have enough stock available.",
		JSON.stringify(withoutStock.body),
	);

	const afterError = await stock(arroz);
	igual("a reserva que passou foi compensada", 4, afterError.reserved_quantity);
	igual("o available voltou ao valor anterior", 6, afterError.available);
	const orphans = await consultar(
		`SELECT id FROM delivery WHERE beneficiary_id = ?1`,
		[assistidoId],
	);
	check(
		"a delivery recusada não sobrou no banco",
		orphans.length === 1,
		`esperava so a delivery criada antes, veio ${orphans.length}`,
	);
	await invariantes("após a 409 de estoque");

	const concluida = await chamar(
		"POST",
		`/api/v1/deliveries/${deliveryId}/complete`,
	);
	check(
		"delivery concluída",
		concluida.status === 200 && concluida.body?.data?.status === "COMPLETED",
		JSON.stringify(concluida.body),
	);

	const afterComplete = await stock(arroz);
	igual("concluir baixa o físico", 6, afterComplete.on_hand);
	igual("concluir consome a reserva", 0, afterComplete.reserved_quantity);
	igual("o available não muda ao concluir", 6, afterComplete.available);
	await invariantes("após concluir");

	const outra = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: now,
		lines: [{ inventoryItemId: feijao, quantity: 5 }],
	});
	const otherId = outra.body?.data?.id ?? "";
	igual(
		"segunda delivery reservou",
		5,
		(await stock(feijao)).reserved_quantity,
	);

	const cancelada = await chamar(
		"POST",
		`/api/v1/deliveries/${otherId}/cancel`,
	);
	check(
		"delivery cancelada",
		cancelada.status === 200 && cancelada.body?.data?.status === "CANCELLED",
		JSON.stringify(cancelada.body),
	);

	const afterCancel = await stock(feijao);
	igual("cancelar libera a reserva", 0, afterCancel.reserved_quantity);
	igual("cancelar não mexe no físico", 20, afterCancel.on_hand);
	igual("o available volta ao total", 20, afterCancel.available);
	await invariantes("após cancelar");

	const count = await chamar("POST", "/api/v1/inventory-counts", {
		occurredAt: now,
		countedBy: "check",
		lines: [
			{ inventoryItemId: arroz, countedQuantity: 5 },
			{ inventoryItemId: feijao, countedQuantity: 25 },
		],
	});
	check(
		"contagem registrada",
		count.status === 201,
		JSON.stringify(count.body),
	);
	const countId = count.body?.data?.id ?? "";

	const afterRiceCounted = await stock(arroz);
	igual("contagem também mexe no primeiro item", 5, afterRiceCounted.on_hand);
	const afterCount = await stock(feijao);
	igual("contagem sobrescreve o físico", 25, afterCount.on_hand);
	igual("contagem não mexe na reserva", 0, afterCount.reserved_quantity);
	igual("disponível recalculado", 25, afterCount.available);

	const adjustments = await consultar(
		`SELECT reason, delta FROM inventory_adjustment WHERE count_id = ?1 ORDER BY delta`,
		[countId],
	);
	igual(
		"a contagem gravou um STOCKTAKE por item",
		[
			{ reason: "STOCKTAKE", delta: -1 },
			{ reason: "STOCKTAKE", delta: 5 },
		],
		adjustments,
	);

	await invariantes("após a contagem");

	const adjustment = await chamar("POST", "/api/v1/inventory-adjustments", {
		inventoryItemId: arroz,
		delta: -2,
		reason: "DAMAGE",
		occurredAt: now,
	});
	check(
		"ajuste registrado",
		adjustment.status === 201,
		JSON.stringify(adjustment.body),
	);
	igual("ajuste moveu o físico", 3, (await stock(arroz)).on_hand);

	const motivoProibido = await chamar("POST", "/api/v1/inventory-adjustments", {
		inventoryItemId: arroz,
		delta: 1,
		reason: "CORRECTION",
		occurredAt: now,
	});
	igual("CORRECTION pelo cliente é recusado", 400, motivoProibido.status);

	const belowZero = await chamar("POST", "/api/v1/inventory-adjustments", {
		inventoryItemId: arroz,
		delta: -99,
		reason: "LOSS",
		occurredAt: now,
	});
	igual("ajuste abaixo de zero é 409", 409, belowZero.status);
	igual("e o físico não mudou", 3, (await stock(arroz)).on_hand);

	const orphanAdjustments = await consultar(
		`SELECT count(*) AS total FROM inventory_adjustment WHERE inventory_item_id = ?1`,
		[arroz],
	);
	igual(
		"o ajuste recusado não ficou registrado",
		2,
		orphanAdjustments[0].total,
	);
	await invariantes("final");

	const repeatedLine = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: now,
		lines: [
			{ inventoryItemId: arroz, quantity: 1 },
			{ inventoryItemId: arroz, quantity: 2 },
		],
	});
	igual("item repetido na mesma delivery é 400", 400, repeatedLine.status);

	const zeroQuantity = await chamar("POST", "/api/v1/donations", {
		donorId: doadorId,
		occurredAt: now,
		lines: [{ inventoryItemId: arroz, quantity: 0 }],
	});
	igual("quantidade zero é 400", 400, zeroQuantity.status);

	const withoutLines = await chamar("POST", "/api/v1/donations", {
		donorId: doadorId,
		occurredAt: now,
		lines: [],
	});
	igual("doação sem linhas é 400", 400, withoutLines.status);

	const doadorFantasma = await chamar("POST", "/api/v1/donations", {
		donorId: "nao-existe",
		occurredAt: now,
		lines: [{ inventoryItemId: arroz, quantity: 1 }],
	});
	igual("doador inexistente é 400", 400, doadorFantasma.status);
	igual(
		"com o código de referência",
		"INVALID_REFERENCE",
		doadorFantasma.body?.error?.code,
	);
}

try {
	await main();
} finally {
	await limpar();
	await dispose();
}

console.log(
	failures === 0
		? "\nTODAS AS VERIFICACOES PASSARAM"
		: `\n${failures} FALHARAM`,
);
process.exit(failures === 0 ? 0 : 1);
