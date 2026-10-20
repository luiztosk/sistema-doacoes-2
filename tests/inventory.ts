import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { app } from "../src/worker/app";
import { apiRoutes } from "../src/worker/routes";
import { handleApiError } from "../src/worker/api/errors";

/**
 * As operações de estoque contra o D1 local. O banco é o de verdade — o
 * trigger da guarda mora nele, e um stub não provaria nada sobre a guarda.
 */

app.openapiRoutes(apiRoutes);
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
	data?: {
		id?: string;
		status?: string;
		items?: { itemId?: string; quantity?: number }[];
		[chave: string]: unknown;
	};
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

async function saldo(itemId: string) {
	const rows = await consultar<{
		on_hand: number;
		reserved: number;
		available: number;
	}>(
		`SELECT on_hand, reserved, available FROM inventory_item WHERE id = ?1`,
		[itemId],
	);
	return rows[0];
}

async function movimentos(itemId: string) {
	return consultar<{ kind: string; ref_id: string }>(
		`SELECT kind, ref_id FROM ledger WHERE item_id = ?1 ORDER BY seq`,
		[itemId],
	);
}

const ANCHORS = {
	items: `name LIKE 'check-item-%'`,
	categories: `name LIKE 'check-categoria-%'`,
	donors: `name = 'check-doador'`,
	beneficiaries: `name = 'check-assistido'`,
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
	const donors = await idsDe(`SELECT id FROM donor WHERE ${ANCHORS.donors}`);
	const beneficiaries = await idsDe(
		`SELECT id FROM beneficiary WHERE ${ANCHORS.beneficiaries}`,
	);
	const donations = await idsDe(
		`SELECT id FROM donation WHERE donor_id IN (SELECT id FROM donor WHERE ${ANCHORS.donors})`,
	);
	const deliveries = await idsDe(
		`SELECT id FROM delivery WHERE beneficiary_id IN (SELECT id FROM beneficiary WHERE ${ANCHORS.beneficiaries})`,
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

	await apagarFilhos("ledger", "item_id", items);
	await apagarFilhos("inventory_adjustment", "inventory_item_id", items);
	await apagar("inventory_count", deliveries.length === 0 ? [] : await idsDe(`SELECT id FROM inventory_count WHERE counted_by = 'check'`));
	await apagar("delivery", deliveries);
	await apagar("donation", donations);
	await apagar("inventory_item", items);
	await apagar("item_category", categories);
	await apagar("donor", donors);
	await apagar("beneficiary", beneficiaries);
}

/**
 * As duas invariantes do modelo. O cache bate com o ledger, e o estoque
 * nunca overcommitou — em nenhum momento da história.
 */
async function invariantes(rotulo: string) {
	const divergentes = await consultar(
		`SELECT l.item_id,
		        SUM(l.on_hand_delta) AS ledger_on_hand,
		        SUM(l.reserved_delta) AS ledger_reserved,
		        i.on_hand, i.reserved
		   FROM ledger l JOIN inventory_item i ON i.id = l.item_id
		  GROUP BY l.item_id
		 HAVING SUM(l.on_hand_delta) <> i.on_hand
		     OR SUM(l.reserved_delta) <> i.reserved`,
	);
	check(
		`${rotulo}: o cache bate com o ledger`,
		divergentes.length === 0,
		JSON.stringify(divergentes),
	);

	const overcommitted = await consultar(
		`SELECT COUNT(*) AS total FROM (
			SELECT SUM(on_hand_delta) OVER w - SUM(reserved_delta) OVER w AS available
			  FROM ledger WINDOW w AS (PARTITION BY item_id ORDER BY seq)
		) WHERE available < 0`,
	);
	check(
		`${rotulo}: o estoque nunca overcommitou`,
		overcommitted[0]?.total === 0,
		JSON.stringify(overcommitted),
	);
}

/**
 * O `ref_id` do ledger aponta para o documento, conforme o `kind`. Como não
 * é uma FK, a integridade é uma consulta — e por isso ela é teste.
 */
async function integridadeDoRefId() {
	const orfaos = await consultar(
		`SELECT l.id, l.kind, l.ref_id FROM ledger l
		  WHERE (l.kind = 'RECEIVE' AND NOT EXISTS (SELECT 1 FROM donation d WHERE d.id = l.ref_id))
		     OR (l.kind IN ('RESERVE', 'ISSUE', 'RELEASE') AND NOT EXISTS (SELECT 1 FROM delivery d WHERE d.id = l.ref_id))
		     OR (l.kind = 'COUNT' AND NOT EXISTS (SELECT 1 FROM inventory_count c WHERE c.id = l.ref_id))
		     OR (l.kind = 'ADJUST' AND NOT EXISTS (SELECT 1 FROM inventory_adjustment a WHERE a.id = l.ref_id))
		     OR (l.kind = 'REVERSE' AND NOT EXISTS (SELECT 1 FROM ledger origem WHERE origem.id = l.ref_id))`,
	);
	check(
		"todo ref_id do ledger aponta para o documento que o originou",
		orfaos.length === 0,
		JSON.stringify(orfaos),
	);
}

async function conferirMinusculo() {
	const tabelas: [string, string[]][] = [
		["beneficiary", ["id"]],
		["donor", ["id"]],
		["item_category", ["id"]],
		["inventory_item", ["id"]],
		["donation", ["id", "donor_id"]],
		["delivery", ["id", "beneficiary_id"]],
		["inventory_count", ["id"]],
		["inventory_adjustment", ["id", "inventory_item_id", "count_id"]],
		["ledger", ["id", "item_id", "ref_id"]],
	];

	for (const [tabela, colunas] of tabelas) {
		for (const coluna of colunas) {
			const fora = await consultar<Record<string, string>>(
				`SELECT ${coluna} AS valor FROM ${tabela} WHERE ${coluna} <> lower(${coluna}) LIMIT 5`,
			);
			check(
				`${tabela}.${coluna} em minuscula`,
				fora.length === 0,
				fora.map((row) => row.valor).join(", "),
			);
		}
	}
}

async function main() {
	await limpar();
	await conferirMinusculo();

	const now = "2026-10-01T12:00:00Z";
	const marca = Date.now();

	const category = await chamar("POST", "/api/v1/inventory/categories", {
		name: `check-categoria-${marca}`,
	});
	check(
		"categoria criada",
		category.status === 201,
		JSON.stringify(category.body),
	);
	const categoryId = category.body?.data?.id ?? "";

	const doador = await chamar("POST", "/api/v1/donors", {
		name: "check-doador",
		phone: "+5511999999999",
		bairro: "Centro",
		cidade: "São Paulo",
		uf: "SP",
	});
	check("doador criado", doador.status === 201, JSON.stringify(doador.body));
	const doadorId = doador.body?.data?.id ?? "";

	const assistido = await chamar("POST", "/api/v1/beneficiaries", {
		name: "check-assistido",
		phone: "+5511988888888",
		bairro: "Centro",
		cidade: "São Paulo",
		uf: "SP",
	});
	check(
		"assistido criado",
		assistido.status === 201,
		JSON.stringify(assistido.body),
	);
	const assistidoId = assistido.body?.data?.id ?? "";

	const itemIds: string[] = [];
	for (const nome of ["Arroz", "Feijao", "Oleo"]) {
		const criado = await chamar("POST", "/api/v1/inventory/items", {
			name: `check-item-${nome}-${marca}`,
			categoryId,
			unit: "KG",
		});
		check(`item ${nome} criado`, criado.status === 201, JSON.stringify(criado.body));
		itemIds.push(criado.body?.data?.id ?? "");
	}

	const [arroz, feijao, oleo] = itemIds;
	igual("item novo nasce com estoque zero", 0, (await saldo(arroz)).on_hand);
	igual("e sem reserva", 0, (await saldo(arroz)).reserved);
	igual("e disponível zero", 0, (await saldo(arroz)).available);

	const comSaldo = await chamar("POST", "/api/v1/inventory/items", {
		name: `check-contador-${marca}`,
		categoryId,
		unit: "KG",
		onHand: 500,
	});
	igual("POST de item com onHand é recusado", 400, comSaldo.status);
	igual(
		"e com o código de campo desconhecido",
		"UNKNOWN_FIELD",
		comSaldo.body?.error?.code,
	);

	const donation = await chamar("POST", "/api/v1/donations", {
		donorId: doadorId,
		occurredAt: now,
		note: "check",
		items: [
			{ itemId: arroz, quantity: 10 },
			{ itemId: feijao, quantity: 20 },
		],
	});
	check(
		"doação criada e recebida",
		donation.status === 201 && donation.body?.data?.status === "RECEIVED",
		JSON.stringify(donation.body),
	);
	const donationId = donation.body?.data?.id ?? "";

	igual(
		"o detalhe da doação devolve os itens",
		[
			{ itemId: arroz, quantity: 10 },
			{ itemId: feijao, quantity: 20 },
		],
		donation.body?.data?.items,
	);

	const donationLista = await chamar("GET", "/api/v1/donations");
	check(
		"a lista não carrega os itens, só o detalhe",
		Array.isArray(donationLista.body?.data) &&
			donationLista.body.data.every(
				(row: Record<string, unknown>) => row.items === undefined,
			),
		"a lista veio com items",
	);

	const afterDonation = await saldo(arroz);
	igual("receber soma a quantidade no on_hand", 10, afterDonation.on_hand);
	igual("available da coluna gerada", 10, afterDonation.available);
	igual("segundo item creditado", 20, (await saldo(feijao)).on_hand);
	igual(
		"o ledger guardou o RECEIVE",
		[{ kind: "RECEIVE", ref_id: donationId }],
		await movimentos(arroz),
	);
	await invariantes("após receber");

	const delivery = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: now,
		items: [{ itemId: arroz, quantity: 4 }],
	});
	check("entrega criada e reservada", delivery.status === 201, JSON.stringify(delivery.body));
	const deliveryId = delivery.body?.data?.id ?? "";

	const afterReserve = await saldo(arroz);
	igual("reservar não mexe no físico", 10, afterReserve.on_hand);
	igual("reservar sobe o reservado", 4, afterReserve.reserved);
	igual("available cai sem o físico mudar", 6, afterReserve.available);
	await invariantes("após reservar");

	const semEstoque = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: now,
		items: [
			{ itemId: arroz, quantity: 3 },
			{ itemId: oleo, quantity: 5 },
		],
	});
	igual("reserva acima do disponível é 409", 409, semEstoque.status);
	igual(
		"com o código de estoque",
		"INSUFFICIENT_STOCK",
		semEstoque.body?.error?.code,
	);

	const afterError = await saldo(arroz);
	igual("a reserva recusada não mexeu no reservado", 4, afterError.reserved);
	igual("e nem no físico", 10, afterError.on_hand);
	const orfaos = await consultar(
		`SELECT id FROM delivery WHERE beneficiary_id = ?1`,
		[assistidoId],
	);
	igual(
		"a entrega recusada não sobrou no banco",
		1,
		orfaos.length,
	);
	await invariantes("após a 409 de estoque");

	const concluida = await chamar(
		"POST",
		`/api/v1/deliveries/${deliveryId}/complete`,
	);
	check(
		"entrega concluída",
		concluida.status === 200 && concluida.body?.data?.status === "COMPLETED",
		JSON.stringify(concluida.body),
	);

	const afterComplete = await saldo(arroz);
	igual("concluir baixa o físico", 6, afterComplete.on_hand);
	igual("concluir consome a reserva", 0, afterComplete.reserved);
	igual("o available não muda ao concluir", 6, afterComplete.available);
	igual(
		"o ledger guardou a RESERVE e a ISSUE",
		["RECEIVE", "RESERVE", "ISSUE"],
		(await movimentos(arroz)).map((row) => row.kind),
	);
	await invariantes("após concluir");

	const outra = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: now,
		items: [{ itemId: feijao, quantity: 5 }],
	});
	const outraId = outra.body?.data?.id ?? "";
	igual("segunda entrega reservou", 5, (await saldo(feijao)).reserved);

	const cancelada = await chamar("POST", `/api/v1/deliveries/${outraId}/cancel`);
	check(
		"entrega cancelada",
		cancelada.status === 200 && cancelada.body?.data?.status === "CANCELLED",
		JSON.stringify(cancelada.body),
	);

	const afterCancel = await saldo(feijao);
	igual("cancelar libera a reserva", 0, afterCancel.reserved);
	igual("cancelar não mexe no físico", 20, afterCancel.on_hand);
	igual("o available volta ao total", 20, afterCancel.available);
	await invariantes("após cancelar");

	const estornada = await chamar("POST", `/api/v1/donations/${donationId}/void`);
	igual(
		"estornar uma doação já entregue é 409",
		409,
		estornada.status,
	);
	igual(
		"com o código de estoque negativo",
		"NEGATIVE_STOCK",
		estornada.body?.error?.code,
	);
	igual("e o físico não mudou", 6, (await saldo(arroz)).on_hand);
	await invariantes("após o estorno recusado");

	const doacaoParaEstornar = await chamar("POST", "/api/v1/donations", {
		donorId: doadorId,
		occurredAt: now,
		items: [{ itemId: oleo, quantity: 3 }],
	});
	const doacaoParaEstornarId = doacaoParaEstornar.body?.data?.id ?? "";
	igual("a nova doação credita o item", 3, (await saldo(oleo)).on_hand);

	const estorno = await chamar(
		"POST",
		`/api/v1/donations/${doacaoParaEstornarId}/void`,
	);
	check(
		"doação estornada",
		estorno.status === 200 && estorno.body?.data?.status === "VOID",
		JSON.stringify(estorno.body),
	);
	const afterVoid = await saldo(oleo);
	igual("estornar devolve o físico", 0, afterVoid.on_hand);
	igual(
		"o ledger guardou o REVERSE",
		["RECEIVE", "REVERSE"],
		(await movimentos(oleo)).map((row) => row.kind),
	);
	igual(
		"o REVERSE aponta para a entrada que ele estorna",
		1,
		(
			await consultar<{ total: number }>(
				`SELECT COUNT(*) AS total FROM ledger l
				  WHERE l.kind = 'REVERSE'
				    AND l.item_id = ?1
				    AND EXISTS (SELECT 1 FROM ledger origem WHERE origem.id = l.ref_id)`,
				[oleo],
			)
		)[0]?.total,
	);
	igual(
		"o conteúdo da doação continua o que foi criado",
		[{ itemId: oleo, quantity: 3 }],
		estorno.body?.data?.items,
	);

	const estornarDeNovo = await chamar(
		"POST",
		`/api/v1/donations/${doacaoParaEstornarId}/void`,
	);
	igual("estornar de novo é transição inválida", 400, estornarDeNovo.status);
	igual(
		"com o código de transição",
		"INVALID_TRANSITION",
		estornarDeNovo.body?.error?.code,
	);
	await invariantes("após estornar");

	const count = await chamar("POST", "/api/v1/inventory-counts", {
		occurredAt: now,
		countedBy: "check",
		items: [
			{ itemId: arroz, countedQuantity: 5 },
			{ itemId: feijao, countedQuantity: 25 },
		],
	});
	check("contagem registrada", count.status === 201, JSON.stringify(count.body));
	const countId = count.body?.data?.id ?? "";

	igual("contagem re-baselineia o físico", 5, (await saldo(arroz)).on_hand);
	igual("contagem sobrescreve o físico", 25, (await saldo(feijao)).on_hand);
	igual("contagem não mexe na reserva", 0, (await saldo(feijao)).reserved);
	igual("disponível recalculado", 25, (await saldo(feijao)).available);

	const ajustes = await consultar(
		`SELECT reason, delta FROM inventory_adjustment WHERE count_id = ?1 ORDER BY delta`,
		[countId],
	);
	igual(
		"a contagem gravou um STOCKTAKE por item",
		[
			{ reason: "STOCKTAKE", delta: -1 },
			{ reason: "STOCKTAKE", delta: 5 },
		],
		ajustes,
	);
	await invariantes("após a contagem");

	const adjustment = await chamar("POST", "/api/v1/inventory-adjustments", {
		itemId: arroz,
		delta: -2,
		reason: "DAMAGE",
		occurredAt: now,
	});
	check("ajuste registrado", adjustment.status === 201, JSON.stringify(adjustment.body));
	igual("ajuste moveu o físico", 3, (await saldo(arroz)).on_hand);

	const motivoProibido = await chamar("POST", "/api/v1/inventory-adjustments", {
		itemId: arroz,
		delta: 1,
		reason: "CORRECTION",
		occurredAt: now,
	});
	igual("CORRECTION pelo cliente é recusado", 400, motivoProibido.status);

	const abaixoDoReservado = await chamar(
		"POST",
		"/api/v1/inventory-adjustments",
		{
			itemId: arroz,
			delta: -99,
			reason: "LOSS",
			occurredAt: now,
		},
	);
	igual("ajuste abaixo do físico é 409", 409, abaixoDoReservado.status);
	igual(
		"com o código de estoque negativo",
		"NEGATIVE_STOCK",
		abaixoDoReservado.body?.error?.code,
	);
	igual("e o físico não mudou", 3, (await saldo(arroz)).on_hand);
	await invariantes("após o ajuste");

	const itemRepetido = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: now,
		items: [
			{ itemId: arroz, quantity: 1 },
			{ itemId: arroz, quantity: 2 },
		],
	});
	igual("item repetido na mesma entrega é 400", 400, itemRepetido.status);
	igual(
		"com o código de valor inválido",
		"INVALID_VALUE",
		itemRepetido.body?.error?.code,
	);

	const quantidadeZero = await chamar("POST", "/api/v1/donations", {
		donorId: doadorId,
		occurredAt: now,
		items: [{ itemId: arroz, quantity: 0 }],
	});
	igual("quantidade zero é 400", 400, quantidadeZero.status);

	const semItens = await chamar("POST", "/api/v1/donations", {
		donorId: doadorId,
		occurredAt: now,
		items: [],
	});
	igual("doação sem itens é 400", 400, semItens.status);

	const doadorFantasma = await chamar("POST", "/api/v1/donations", {
		donorId: "00000000-0000-4000-8000-000000000000",
		occurredAt: now,
		items: [{ itemId: arroz, quantity: 1 }],
	});
	igual("doador inexistente é 400", 400, doadorFantasma.status);
	igual(
		"com o código de referência",
		"INVALID_REFERENCE",
		doadorFantasma.body?.error?.code,
	);

	const ledger = await chamar("GET", `/api/v1/ledger?itemId=${arroz}`);
	check("o ledger pagina no servidor", ledger.status === 200, JSON.stringify(ledger.body));
	const pagina = ledger.body?.data as
		| { items?: unknown[]; total?: number; page?: number; pageSize?: number }
		| undefined;
	check("a página do ledger tem os itens", (pagina?.items?.length ?? 0) > 0);
	igual("a página começa em zero", 0, pagina?.page);
	check("o total conta a história", (pagina?.total ?? 0) >= 4);

	const stock = await chamar("GET", "/api/v1/stock");
	check("o saldo responde", stock.status === 200, JSON.stringify(stock.body));
	check(
		"o saldo devolve uma linha por item",
		Array.isArray(stock.body?.data) && stock.body.data.length > 0,
	);

	await integridadeDoRefId();
	await invariantes("final");
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
