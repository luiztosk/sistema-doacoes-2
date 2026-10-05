import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { handleApiError } from "../src/worker/api/errors";
import { registerResources } from "../src/worker/api/v1";
import { inventoryItems } from "../src/worker/routes/inventory-items";

/**
 * The API driven end to end without a D1: every route runs for real, and the
 * database is a stub that either answers with rows or fails the way D1 fails.
 * Run with `npm test`.
 */

class DbError extends Error {
	override name = "DbError";
}

type Row = Record<string, unknown>;

/**
 * The columns a query asked for, in order, so a fixture can be written as an
 * object keyed by column name: `select "id", "nome_id", "status" …` and
 * `… returning "id"` are the two shapes this API produces.
 */
function selectedColumns(sql: string): string[] {
	const list =
		sql.match(/select (.+?) from /i)?.[1] ??
		sql.match(/returning (.+)$/i)?.[1] ??
		"";

	return list.split(",").map((column) => column.trim().replace(/^"|"$/g, ""));
}

type BatchChanges = number[][];

function stubEnv(
	opts: { dbError?: string; rows?: Row[]; batches?: BatchChanges } = {},
) {
	const rows = opts.rows ?? [];
	let chamada = 0;
	const fail = () => {
		throw new DbError(opts.dbError ?? "unexpected query");
	};

	const prepare = (sql: string) => {
		// Drizzle reads every result through `raw()`, which is positional:
		// the values of a row, in the order the query asked for them.
		const columns = selectedColumns(sql);
		const stmt = {
			bind: () => stmt,
			raw: async () => {
				if (opts.dbError) fail();
				return rows.map((row) => columns.map((column) => row[column] ?? null));
			},
			run: async () => {
				if (opts.dbError) fail();
				return { success: true, meta: { changes: 1 } };
			},
		};

		return stmt;
	};

	return {
		prod_sistema_doacoes_2: {
			prepare,
			batch: async (statements: unknown[]) => {
				if (opts.dbError) fail();
				const changes = opts.batches?.[chamada] ?? [];
				chamada += 1;

				return statements.map((_, i) => ({
					success: true,
					results: [],
					meta: { changes: changes[i] ?? 1 },
				}));
			},
			exec: async () => {
				if (opts.dbError) fail();
				return { count: 0, duration: 0 };
			},
		},
	};
}

const app = new Hono<{ Bindings: Env }>();
const api = new Hono<{ Bindings: Env }>();
registerResources(api);
app.route("/api/v1", api);
app.route("/api/v1/inventory-items", inventoryItems);
app.get("/sem-sessao", () => {
  throw new HTTPException(401);
});
app.onError(handleApiError);

const ASSISTIDO: Row = { id: "1", nome: "Ana", renda: 0 };
type Caso = {
	nome: string;
	method: string;
	path: string;
	body?: unknown;
	contentType?: string;
	rows?: Row[];
	batches?: BatchChanges;
	dbError?: string;
	status: number;
	code?: string;
	message?: string;
	noBody?: boolean;
};

const DOACAO_RECEBIDA: Row = {
	id: "d1",
	donor_id: "dn1",
	occurred_at: 1750000000,
	status: "RECEIVED",
};

const DOACAO_RASCUNHO: Row = {
	...DOACAO_RECEBIDA,
	status: "DRAFT",
};

const ENTREGA_ABERTA: Row = {
	id: "e1",
	beneficiary_id: "a1",
	occurred_at: 1750000000,
	status: "OPEN",
};

const ENTREGA_CONCLUIDA: Row = { ...ENTREGA_ABERTA, status: "COMPLETED" };

const casos: Caso[] = [
	{
		nome: "body sem o campo obrigatório",
		method: "POST",
		path: "/api/v1/assistidos",
		body: {},
		status: 400,
		code: "REQUIRED_FIELD",
		message: "Field 'nome' is required.",
	},
	{
		nome: "null conta como ausente",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: null },
		status: 400,
		code: "REQUIRED_FIELD",
		message: "Field 'nome' is required.",
	},
	{
		nome: "nome em branco",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "   " },
		status: 400,
		code: "INVALID_VALUE",
		message: "Field 'nome' has an invalid value.",
	},
	{
		nome: "renda negativa",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", renda: -1 },
		status: 400,
		code: "INVALID_VALUE",
		message: "Field 'renda' has an invalid value.",
	},
	{
		nome: "cep com letra",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", cep: "abc" },
		status: 400,
		code: "INVALID_VALUE",
		message: "Field 'cep' has an invalid value.",
	},
	{
		nome: "booleano como texto",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", aposentado: "sim" },
		status: 400,
		code: "INVALID_VALUE",
		message: "Field 'aposentado' has an invalid value.",
	},
	{
		nome: "valorAluguel negativo",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", valorAluguel: -1 },
		status: 400,
		code: "INVALID_VALUE",
		message: "Field 'valorAluguel' has an invalid value.",
	},
	{
		nome: "uf que não é sigla",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", uf: "abc" },
		status: 400,
		code: "INVALID_VALUE",
		message:
			"Field 'uf' must be one of: AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO.",
	},
	{
		nome: "uf fora da lista",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", uf: "sp" },
		status: 400,
		code: "INVALID_VALUE",
		message:
			"Field 'uf' must be one of: AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO.",
	},
	{
		nome: "email sem arroba",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", email: "abc" },
		status: 400,
		code: "INVALID_VALUE",
		message: "Field 'email' has an invalid value.",
	},
	{
		nome: "cep com hifen é recusado",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", cep: "01310-100" },
		status: 400,
		code: "INVALID_VALUE",
		message: "Field 'cep' has an invalid value.",
	},
	{
		nome: "tipoImovel e valorAluguel podem ser independentes",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", tipoImovel: "PROPRIO", valorAluguel: 1 },
		status: 201,
		rows: [{ ...ASSISTIDO, tipoImovel: "PROPRIO", valorAluguel: 1 }],
	},
	{
		nome: "campo que não existe",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", zzz: 1 },
		status: 400,
		code: "UNKNOWN_FIELD",
		message: "Field 'zzz' is not accepted in this resource.",
	},
	{
		nome: "id é do servidor",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", id: "x" },
		status: 400,
		code: "READ_ONLY_FIELD",
		message: "Field 'id' is set by the server.",
	},
	{
		nome: "patch sem nenhum campo",
		method: "PATCH",
		path: "/api/v1/assistidos/1",
		body: {},
		rows: [ASSISTIDO],
		status: 400,
		code: "EMPTY_UPDATE",
		message: "Send at least one field to update.",
	},
	{
		nome: "registro inexistente",
		method: "GET",
		path: "/api/v1/assistidos/1",
		rows: [],
		status: 404,
		code: "NOT_FOUND",
		message: "Assistido not found.",
	},
	{
		nome: "content-type errado",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana" },
		contentType: "text/plain",
		status: 415,
		code: "UNSUPPORTED_MEDIA_TYPE",
		message: "Send the body as application/json.",
	},
	{
		nome: "referência que não existe no POST",
		method: "POST",
		path: "/api/v1/donations",
		body: {
			donorId: "nao-existe",
			occurredAt: "2026-01-02T03:04:05Z",
			lines: [{ inventoryItemId: "i1", quantity: 1 }],
		},
		dbError:
			"FOREIGN KEY constraint failed: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_FOREIGNKEY)",
		status: 400,
		code: "INVALID_REFERENCE",
		message: "One of the references sent does not exist.",
	},
	{
		nome: "referência bloqueada no DELETE",
		method: "DELETE",
		path: "/api/v1/doadores/1",
		dbError: "FOREIGN KEY constraint failed: SQLITE_CONSTRAINT",
		status: 409,
		code: "CONFLICT",
		message: "The operation conflicts with related records.",
	},
	{
		nome: "valor repetido no catálogo",
		method: "POST",
		path: "/api/v1/inventory-items",
		body: { name: "Arroz 5kg", categoryId: "c1", unit: "KG" },
		dbError: "UNIQUE constraint failed: index 'inventory_item_name_uniq'",
		status: 409,
		code: "CONFLICT",
		message: "A record with that value already exists.",
	},
	{
		nome: "erro inesperado",
		method: "GET",
		path: "/api/v1/assistidos",
		dbError: "D1_ERROR: something else went wrong",
		status: 500,
		code: "INTERNAL_ERROR",
		message: "Could not complete the operation.",
	},
	{
		nome: "401 sem envelope, como o requireSession faz",
		method: "GET",
		path: "/sem-sessao",
		status: 401,
		noBody: true,
	},
	{
		nome: "doação nasce com as linhas em DRAFT",
		method: "POST",
		path: "/api/v1/donations",
		body: {
			donorId: "dn1",
			occurredAt: "2026-01-02T03:04:05Z",
			lines: [{ inventoryItemId: "i1", quantity: 5 }],
		},
		rows: [DOACAO_RASCUNHO],
		status: 201,
	},
	{
		nome: "quantidade zero na linha",
		method: "POST",
		path: "/api/v1/donations",
		body: {
			donorId: "dn1",
			occurredAt: "2026-01-02T03:04:05Z",
			lines: [{ inventoryItemId: "i1", quantity: 0 }],
		},
		status: 400,
		code: "INVALID_VALUE",
		message: "Field 'lines' has an invalid value.",
	},
	{
		nome: "doação sem nenhuma linha",
		method: "POST",
		path: "/api/v1/donations",
		body: { donorId: "dn1", occurredAt: "2026-01-02T03:04:05Z", lines: [] },
		status: 400,
		code: "INVALID_VALUE",
		message: "Field 'lines' has an invalid value.",
	},
	{
		nome: "mesmo item duas vezes na mesma doação",
		method: "POST",
		path: "/api/v1/donations",
		body: {
			donorId: "dn1",
			occurredAt: "2026-01-02T03:04:05Z",
			lines: [
				{ inventoryItemId: "i1", quantity: 1 },
				{ inventoryItemId: "i1", quantity: 2 },
			],
		},
		status: 400,
		code: "INVALID_VALUE",
		message: "An item cannot appear twice in the same donation.",
	},
	{
		nome: "status da doação não é do cliente",
		method: "POST",
		path: "/api/v1/donations",
		body: {
			donorId: "dn1",
			occurredAt: "2026-01-02T03:04:05Z",
			status: "RECEIVED",
			lines: [{ inventoryItemId: "i1", quantity: 1 }],
		},
		status: 400,
		code: "UNKNOWN_FIELD",
		message: "Field 'status' is not accepted in this resource.",
	},
	{
		nome: "receber doação que não é DRAFT",
		method: "POST",
		path: "/api/v1/donations/d1/receive",
		rows: [DOACAO_RECEBIDA],
		status: 400,
		code: "INVALID_TRANSITION",
		message: "Cannot receive a donation in status RECEIVED.",
	},
	{
		nome: "entrega sem estoque é conflito, e diz quantos faltam",
		method: "POST",
		path: "/api/v1/deliveries",
		body: {
			beneficiaryId: "a1",
			occurredAt: "2026-01-02T03:04:05Z",
			lines: [
				{ inventoryItemId: "i1", quantity: 3 },
				{ inventoryItemId: "i2", quantity: 5 },
			],
		},
		batches: [
			[1, 1, 1, 1, 0],
			[1, 1],
		],
		status: 409,
		code: "INSUFFICIENT_STOCK",
		message: "One of the items does not have enough stock available.",
	},
	{
		nome: "concluir entrega que não está OPEN",
		method: "POST",
		path: "/api/v1/deliveries/e1/complete",
		rows: [ENTREGA_CONCLUIDA],
		status: 400,
		code: "INVALID_TRANSITION",
		message: "Cannot complete a delivery in status COMPLETED.",
	},
	{
		nome: "contagem abaixo do reservado",
		method: "POST",
		path: "/api/v1/inventory-counts",
		body: {
			occurredAt: "2026-01-02T03:04:05Z",
			lines: [{ inventoryItemId: "i1", countedQuantity: 1 }],
		},
		rows: [{ id: "i1", on_hand: 10, reserved_quantity: 5 }],
		status: 409,
		code: "INSUFFICIENT_STOCK",
		message: "One of the items does not have enough stock available.",
	},
	{
		nome: "ajuste que deixaria o estoque negativo",
		method: "POST",
		path: "/api/v1/inventory-adjustments",
		body: {
			inventoryItemId: "i1",
			delta: -99,
			reason: "LOSS",
			occurredAt: "2026-01-02T03:04:05Z",
		},
		batches: [[1, 0]],
		status: 409,
		code: "CONFLICT",
		message: "The adjustment would leave the stock below zero.",
	},
	{
		nome: "CORRECTION e STOCKTAKE não são do cliente",
		method: "POST",
		path: "/api/v1/inventory-adjustments",
		body: {
			inventoryItemId: "i1",
			delta: 1,
			reason: "CORRECTION",
			occurredAt: "2026-01-02T03:04:05Z",
		},
		status: 400,
		code: "INVALID_VALUE",
		message: "Field 'reason' must be one of: DONOR_RETURN, LOSS, DAMAGE.",
	},
	{
		nome: "o contador do estoque não é do cliente",
		method: "POST",
		path: "/api/v1/inventory-items",
		body: { name: "Arroz 5kg", categoryId: "c1", unit: "KG", onHand: 500 },
		status: 400,
		code: "UNKNOWN_FIELD",
		message: "Field 'onHand' is not accepted in this resource.",
	},
];

async function run() {
	let failures = 0;

	// `handleApiError` logs unexpected errors on purpose, and one case is an
	// unexpected error. The trace is kept for every case that was not supposed
	// to be a 500 — that is the one that explains a failure.
	const logOriginal = console.error;
	let esperado = false;
	console.error = (...args: unknown[]) => {
		if (!esperado) logOriginal(...args);
	};

	for (const caso of casos) {
		esperado = caso.status === 500;
		const res = await app.request(
			caso.path,
			{
				method: caso.method,
				headers: { "content-type": caso.contentType ?? "application/json" },
				body: caso.body === undefined ? undefined : JSON.stringify(caso.body),
			},
			stubEnv({
				dbError: caso.dbError,
				rows: caso.rows,
				batches: caso.batches,
			}) as never,
		);

		esperado = false;

		const texto = await res.text();
		const problemas: string[] = [];

		if (res.status !== caso.status) {
			problemas.push(`status ${res.status} !== ${caso.status}`);
		}

		if (
			!caso.noBody &&
			!res.headers.get("content-type")?.includes("application/json")
		) {
			problemas.push(`corpo não é JSON: "${texto.slice(0, 80)}"`);
		}

		if (caso.noBody) {
			if (texto !== "") problemas.push(`corpo deveria ser vazio: "${texto}"`);
		} else {
			const type = res.headers.get("content-type") ?? "";
			if (!type.includes("application/json")) {
				problemas.push(`content-type ${type}`);
			}
		}

		if (caso.code !== undefined) {
			const recebido = (JSON.parse(texto) as { error?: { code?: string } })
				.error?.code;
			if (recebido !== caso.code) {
				problemas.push(`code ${recebido} !== ${caso.code}`);
			}
		}

		if (caso.message !== undefined) {
			const recebido = (JSON.parse(texto) as { error?: { message?: string } })
				.error?.message;
			if (recebido !== caso.message) {
				problemas.push(`mensagem ${JSON.stringify(recebido)}`);
			}
		}

		if (problemas.length === 0) {
			console.log(`ok   ${caso.nome}`);
			continue;
		}

		failures += 1;
		console.log(`FALHA ${caso.nome}`);
		for (const problema of problemas) console.log(`       ${problema}`);
	}

	console.error = logOriginal;
	console.log(`\n${casos.length - failures}/${casos.length} passaram`);
	process.exit(failures === 0 ? 0 : 1);
}

void run();
