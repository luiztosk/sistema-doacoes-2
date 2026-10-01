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

let falhas = 0;

function check(nome: string, ok: boolean, detalhe = "") {
	if (ok) {
		console.log(`ok   ${nome}`);
		return;
	}
	falhas += 1;
	console.log(`FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
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

async function estoque(itemId: string) {
	const linhas = await consultar<{
		on_hand: number;
		reserved_quantity: number;
		available: number;
	}>(
		`SELECT on_hand, reserved_quantity, available FROM inventory_item WHERE id = ?1`,
		[itemId],
	);
	return linhas[0];
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
		(await consultar<{ id: string }>(sql)).map((linha) => linha.id);

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

	const apagar = async (tabela: string, ids: string[]) => {
		for (const id of ids) {
			await db.prepare(`DELETE FROM ${tabela} WHERE id = ?1`).bind(id).run();
		}
	};

	const apagarFilhos = async (
		tabela: string,
		coluna: string,
		ids: string[],
	) => {
		if (ids.length === 0) return;
		const lista = ids.map(() => "?").join(", ");
		await db
			.prepare(`DELETE FROM ${tabela} WHERE ${coluna} IN (${lista})`)
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

	const agora = new Date("2026-10-01T12:00:00Z").toISOString();

	const categoria = await chamar("POST", "/api/v1/item-categories", {
		name: `check-categoria-${Date.now()}`,
	});
	check(
		"categoria criada",
		categoria.status === 201,
		JSON.stringify(categoria.body),
	);
	const categoryId = categoria.body?.data?.id ?? "";

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
	igual("item novo nasce com estoque zero", 0, (await estoque(arroz)).on_hand);

	const contadorRecusado = await chamar("POST", "/api/v1/inventory-items", {
		name: `check-contador-${Date.now()}`,
		categoryId,
		unit: "KG",
		onHand: 500,
	});
	igual("POST de item com onHand é recusado", 400, contadorRecusado.status);

	const doacao = await chamar("POST", "/api/v1/donations", {
		donorId: doadorId,
		occurredAt: agora,
		note: "check",
		lines: [
			{ inventoryItemId: arroz, quantity: 10 },
			{ inventoryItemId: feijao, quantity: 20 },
		],
	});
	check(
		"doação criada em DRAFT",
		doacao.status === 201 && doacao.body?.data?.status === "DRAFT",
		JSON.stringify(doacao.body),
	);
	const doacaoId = doacao.body?.data?.id ?? "";

	igual(
		"doação em DRAFT não mexe no estoque",
		0,
		(await estoque(arroz)).on_hand,
	);

	const recebida = await chamar(
		"POST",
		`/api/v1/donations/${doacaoId}/receive`,
	);
	check(
		"doação recebida",
		recebida.status === 200 && recebida.body?.data?.status === "RECEIVED",
		JSON.stringify(recebida.body),
	);

	const depoisArroz = await estoque(arroz);
	const depoisFeijao = await estoque(feijao);
	igual("receber soma a quantidade no on_hand", 10, depoisArroz.on_hand);
	igual("available da coluna gerada", 10, depoisArroz.available);
	igual("segundo item creditado", 20, depoisFeijao.on_hand);

	const receberDuasVezes = await chamar(
		"POST",
		`/api/v1/donations/${doacaoId}/receive`,
	);
	igual(
		"receber duas vezes é transição inválida",
		400,
		receberDuasVezes.status,
	);
	igual("e não credita de novo", 10, (await estoque(arroz)).on_hand);
	await invariantes("após receber");

	const entrega = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: agora,
		lines: [{ inventoryItemId: arroz, quantity: 4 }],
	});
	check(
		"entrega criada e reservada",
		entrega.status === 201,
		JSON.stringify(entrega.body),
	);
	const entregaId = entrega.body?.data?.id ?? "";

	const reservado = await estoque(arroz);
	igual("reservar mexe só em reserved_quantity", 10, reservado.on_hand);
	igual("reserved_quantity subiu", 4, reservado.reserved_quantity);
	igual("available caiu sem o físico mudar", 6, reservado.available);
	const contagemAbaixo = await chamar("POST", "/api/v1/inventory-counts", {
		occurredAt: agora,
		lines: [{ inventoryItemId: arroz, countedQuantity: 1 }],
	});
	igual("contagem abaixo do reservado é 409", 409, contagemAbaixo.status);
	igual(
		"com o código de estoque",
		"INSUFFICIENT_STOCK",
		contagemAbaixo.body?.error?.code,
	);
	igual(
		"e a contagem recusada não mexeu no físico",
		10,
		(await estoque(arroz)).on_hand,
	);

	await invariantes("após reservar");

	const semEstoque = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: agora,
		lines: [
			{ inventoryItemId: arroz, quantity: 3 },
			{ inventoryItemId: oleo, quantity: 5 },
		],
	});
	igual("entrega sem estoque é 409", 409, semEstoque.status);
	igual(
		"com o código certo",
		"INSUFFICIENT_STOCK",
		semEstoque.body?.error?.code,
	);
	check(
		"a mensagem diz quantos itens faltam",
		semEstoque.body?.error?.message ===
			"One of the items does not have enough stock available.",
		JSON.stringify(semEstoque.body),
	);

	const depoisDoErro = await estoque(arroz);
	igual(
		"a reserva que passou foi compensada",
		4,
		depoisDoErro.reserved_quantity,
	);
	igual("o available voltou ao valor anterior", 6, depoisDoErro.available);
	const orfas = await consultar(
		`SELECT id FROM delivery WHERE beneficiary_id = ?1`,
		[assistidoId],
	);
	check(
		"a entrega recusada não sobrou no banco",
		orfas.length === 1,
		`esperava so a entrega criada antes, veio ${orfas.length}`,
	);
	await invariantes("após a 409 de estoque");

	const concluida = await chamar(
		"POST",
		`/api/v1/deliveries/${entregaId}/complete`,
	);
	check(
		"entrega concluída",
		concluida.status === 200 && concluida.body?.data?.status === "COMPLETED",
		JSON.stringify(concluida.body),
	);

	const depoisConcluir = await estoque(arroz);
	igual("concluir baixa o físico", 6, depoisConcluir.on_hand);
	igual("concluir consome a reserva", 0, depoisConcluir.reserved_quantity);
	igual("o available não muda ao concluir", 6, depoisConcluir.available);
	await invariantes("após concluir");

	const outra = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: agora,
		lines: [{ inventoryItemId: feijao, quantity: 5 }],
	});
	const outraId = outra.body?.data?.id ?? "";
	igual(
		"segunda entrega reservou",
		5,
		(await estoque(feijao)).reserved_quantity,
	);

	const cancelada = await chamar(
		"POST",
		`/api/v1/deliveries/${outraId}/cancel`,
	);
	check(
		"entrega cancelada",
		cancelada.status === 200 && cancelada.body?.data?.status === "CANCELLED",
		JSON.stringify(cancelada.body),
	);

	const depoisCancelar = await estoque(feijao);
	igual("cancelar libera a reserva", 0, depoisCancelar.reserved_quantity);
	igual("cancelar não mexe no físico", 20, depoisCancelar.on_hand);
	igual("o available volta ao total", 20, depoisCancelar.available);
	await invariantes("após cancelar");

	const contagem = await chamar("POST", "/api/v1/inventory-counts", {
		occurredAt: agora,
		countedBy: "check",
		lines: [
			{ inventoryItemId: arroz, countedQuantity: 5 },
			{ inventoryItemId: feijao, countedQuantity: 25 },
		],
	});
	check(
		"contagem registrada",
		contagem.status === 201,
		JSON.stringify(contagem.body),
	);
	const contagemId = contagem.body?.data?.id ?? "";

	const depoisArrozContado = await estoque(arroz);
	igual("contagem também mexe no primeiro item", 5, depoisArrozContado.on_hand);
	const depoisContagem = await estoque(feijao);
	igual("contagem sobrescreve o físico", 25, depoisContagem.on_hand);
	igual("contagem não mexe na reserva", 0, depoisContagem.reserved_quantity);
	igual("disponível recalculado", 25, depoisContagem.available);

	const ajustes = await consultar(
		`SELECT reason, delta FROM inventory_adjustment WHERE count_id = ?1 ORDER BY delta`,
		[contagemId],
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

	const ajuste = await chamar("POST", "/api/v1/inventory-adjustments", {
		inventoryItemId: arroz,
		delta: -2,
		reason: "DAMAGE",
		occurredAt: agora,
	});
	check(
		"ajuste registrado",
		ajuste.status === 201,
		JSON.stringify(ajuste.body),
	);
	igual("ajuste moveu o físico", 3, (await estoque(arroz)).on_hand);

	const motivoProibido = await chamar("POST", "/api/v1/inventory-adjustments", {
		inventoryItemId: arroz,
		delta: 1,
		reason: "CORRECTION",
		occurredAt: agora,
	});
	igual("CORRECTION pelo cliente é recusado", 400, motivoProibido.status);

	const abaixoDeZero = await chamar("POST", "/api/v1/inventory-adjustments", {
		inventoryItemId: arroz,
		delta: -99,
		reason: "LOSS",
		occurredAt: agora,
	});
	igual("ajuste abaixo de zero é 409", 409, abaixoDeZero.status);
	igual("e o físico não mudou", 3, (await estoque(arroz)).on_hand);

	const ajusteOrfao = await consultar(
		`SELECT count(*) AS total FROM inventory_adjustment WHERE inventory_item_id = ?1`,
		[arroz],
	);
	igual("o ajuste recusado não ficou registrado", 2, ajusteOrfao[0].total);
	await invariantes("final");

	const linhaRepetida = await chamar("POST", "/api/v1/deliveries", {
		beneficiaryId: assistidoId,
		occurredAt: agora,
		lines: [
			{ inventoryItemId: arroz, quantity: 1 },
			{ inventoryItemId: arroz, quantity: 2 },
		],
	});
	igual("item repetido na mesma entrega é 400", 400, linhaRepetida.status);

	const quantidadeZero = await chamar("POST", "/api/v1/donations", {
		donorId: doadorId,
		occurredAt: agora,
		lines: [{ inventoryItemId: arroz, quantity: 0 }],
	});
	igual("quantidade zero é 400", 400, quantidadeZero.status);

	const semLinhas = await chamar("POST", "/api/v1/donations", {
		donorId: doadorId,
		occurredAt: agora,
		lines: [],
	});
	igual("doação sem linhas é 400", 400, semLinhas.status);

	const doadorFantasma = await chamar("POST", "/api/v1/donations", {
		donorId: "nao-existe",
		occurredAt: agora,
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
	falhas === 0 ? "\nTODAS AS VERIFICACOES PASSARAM" : `\n${falhas} FALHARAM`,
);
process.exit(falhas === 0 ? 0 : 1);
