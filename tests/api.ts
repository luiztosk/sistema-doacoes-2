import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { handleApiError } from "../src/worker/api/errors";
import { registerResources } from "../src/worker/api/v1";

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
		sql.match(/select (.+?) from /i)?.[1] ?? sql.match(/returning (.+)$/i)?.[1] ?? "";

	return list
		.split(",")
		.map((column) => column.trim().replace(/^"|"$/g, ""));
}

function stubEnv(opts: { dbError?: string; rows?: Row[] } = {}) {
	const rows = opts.rows ?? [];
	const fail = () => {
		throw new DbError(opts.dbError ?? "unexpected query");
	};

	return {
		prod_sistema_doacoes_2: {
			prepare: (sql: string) => {
				// Drizzle reads every result through `raw()`, which is positional:
				// the values of a row, in the order the query asked for them.
				const columns = selectedColumns(sql);
				const stmt = {
					bind: () => stmt,
					raw: async () => {
						if (opts.dbError) fail();
						return rows.map((row) =>
							columns.map((column) => row[column] ?? null),
						);
					},
					run: async () => {
						if (opts.dbError) fail();
						return { success: true };
					},
				};

				return stmt;
			},
		},
	};
}

const app = new Hono<{ Bindings: Env }>();
const api = new Hono<{ Bindings: Env }>();
registerResources(api);
app.route("/api/v1", api);
app.get("/sem-sessao", () => {
	throw new HTTPException(401);
});
app.onError(handleApiError);

const ASSISTIDO: Row = { id: "1", nome: "Ana", renda: 0 };
const ITEM: Row = { id: "1", nome_id: "n1", status: "AGUARDA_COLETA" };
const ITEM_EM_ESTOQUE: Row = { ...ITEM, status: "EM_ESTOQUE" };

type Caso = {
	nome: string;
	method: string;
	path: string;
	body?: unknown;
	contentType?: string;
	rows?: Row[];
	dbError?: string;
	status: number;
	code?: string;
	mensagem?: string;
	semCorpo?: boolean;
};

const casos: Caso[] = [
	{
		nome: "body sem o campo obrigatório",
		method: "POST",
		path: "/api/v1/assistidos",
		body: {},
		status: 400,
		code: "REQUIRED_FIELD",
		mensagem: "Field 'nome' is required.",
	},
	{
		nome: "null conta como ausente",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: null },
		status: 400,
		code: "REQUIRED_FIELD",
		mensagem: "Field 'nome' is required.",
	},
	{
		nome: "nome em branco",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "   " },
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'nome' cannot be empty or only whitespace.",
	},
	{
		nome: "renda negativa",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", renda: -1 },
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'renda' has an invalid value.",
	},
	{
		nome: "cep com letra",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", cep: "abc" },
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'cep' has an invalid value.",
	},
	{
		nome: "booleano como texto",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", aposentado: "sim" },
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'aposentado' has an invalid value.",
	},
	{
		nome: "valorAluguel negativo",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", valorAluguel: -1 },
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'valorAluguel' has an invalid value.",
	},
	{
		nome: "uf que não é sigla",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", uf: "abc" },
		status: 400,
		code: "INVALID_VALUE",
		mensagem:
			"Field 'uf' must be one of: AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO.",
	},
	{
		nome: "uf fora da lista",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", uf: "sp" },
		status: 400,
		code: "INVALID_VALUE",
		mensagem:
			"Field 'uf' must be one of: AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO.",
	},
	{
		nome: "regra entre duas colunas não tem campo",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", tipoImovel: "PROPRIO", valorAluguel: 1 },
		status: 400,
		code: "INVALID_VALUE",
		mensagem:
			"'valorAluguel' only exists on an 'ALUGADO' property, and an 'ALUGADO' property requires a 'valorAluguel' greater than zero.",
	},
	{
		nome: "data que não é data",
		method: "POST",
		path: "/api/v1/coletas",
		body: { doadorId: "d1", dataHora: "ontem" },
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'dataHora' has an invalid value.",
	},
	{
		nome: "campo que não existe",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", zzz: 1 },
		status: 400,
		code: "UNKNOWN_FIELD",
		mensagem: "Field 'zzz' is not accepted in this resource.",
	},
	{
		nome: "id é do servidor",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", id: "x" },
		status: 400,
		code: "READ_ONLY_FIELD",
		mensagem: "Field 'id' is set by the server.",
	},
	{
		nome: "item novo não pode nascer entregue",
		method: "POST",
		path: "/api/v1/itens",
		body: { nomeId: "n1", status: "EM_ESTOQUE" },
		status: 400,
		code: "INVALID_STATUS_TRANSITION",
		mensagem: "A new item must start with the status AGUARDA_COLETA.",
	},
	{
		nome: "status fora do enum",
		method: "POST",
		path: "/api/v1/itens",
		body: { nomeId: "n1", status: "PERDIDO" },
		status: 400,
		code: "INVALID_VALUE",
		mensagem:
			"Field 'status' must be one of: AGUARDA_COLETA, EM_ESTOQUE, ENTREGUE.",
	},
	{
		nome: "entregue sem entregaId",
		method: "PATCH",
		path: "/api/v1/itens/1",
		body: { status: "ENTREGUE" },
		rows: [ITEM_EM_ESTOQUE],
		status: 400,
		code: "DELIVERY_REQUIRED",
		mensagem: "A delivered item must have an entregaId.",
	},
	{
		nome: "transição de status pulada",
		method: "PATCH",
		path: "/api/v1/itens/1",
		body: { status: "EM_ESTOQUE" },
		rows: [ITEM],
		status: 200,
	},
	{
		nome: "patch sem nenhum campo",
		method: "PATCH",
		path: "/api/v1/assistidos/1",
		body: {},
		rows: [ASSISTIDO],
		status: 400,
		code: "EMPTY_UPDATE",
		mensagem: "Send at least one field to update.",
	},
	{
		nome: "registro inexistente",
		method: "GET",
		path: "/api/v1/assistidos/1",
		rows: [],
		status: 404,
		code: "NOT_FOUND",
		mensagem: "Assistido not found.",
	},
	{
		nome: "data ISO vira Date e o insert grava",
		method: "POST",
		path: "/api/v1/coletas",
		body: { doadorId: "d1", dataHora: "2026-01-02T03:04:05Z" },
		rows: [{ id: "c1", doador_id: "d1" }],
		status: 201,
	},
	{
		nome: "content-type errado",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana" },
		contentType: "text/plain",
		status: 415,
		code: "UNSUPPORTED_MEDIA_TYPE",
		mensagem: "Send the body as application/json.",
	},
	{
		nome: "referência que não existe no POST",
		method: "POST",
		path: "/api/v1/coletas",
		body: { doadorId: "nao-existe" },
		dbError:
			"FOREIGN KEY constraint failed: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_FOREIGNKEY)",
		status: 400,
		code: "INVALID_REFERENCE",
		mensagem: "One of the references sent does not exist.",
	},
	{
		nome: "referência bloqueada no DELETE",
		method: "DELETE",
		path: "/api/v1/doadores/1",
		dbError: "FOREIGN KEY constraint failed: SQLITE_CONSTRAINT",
		status: 409,
		code: "CONFLICT",
		mensagem: "The operation conflicts with related records.",
	},
	{
		nome: "valor repetido no catálogo",
		method: "POST",
		path: "/api/v1/itens",
		body: { nomeId: "n1" },
		dbError: "UNIQUE constraint failed: nome_item.nome",
		status: 409,
		code: "CONFLICT",
		mensagem: "A record with that value already exists.",
	},
	{
		nome: "erro inesperado",
		method: "GET",
		path: "/api/v1/assistidos",
		dbError: "D1_ERROR: something else went wrong",
		status: 500,
		code: "INTERNAL_ERROR",
		mensagem: "Could not complete the operation.",
	},
	{
		nome: "401 sem envelope, como o requireSession faz",
		method: "GET",
		path: "/sem-sessao",
		status: 401,
		semCorpo: true,
	},
];

async function run() {
	let falhas = 0;

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
			stubEnv({ dbError: caso.dbError, rows: caso.rows }) as never,
		);

		esperado = false;

		const texto = await res.text();
		const problemas: string[] = [];

		if (res.status !== caso.status) {
			problemas.push(`status ${res.status} !== ${caso.status}`);
		}

		if (caso.semCorpo) {
			if (texto !== "") problemas.push(`corpo deveria ser vazio: "${texto}"`);
		} else {
			const type = res.headers.get("content-type") ?? "";
			if (!type.includes("application/json")) {
				problemas.push(`content-type ${type}`);
			}
		}

		if (caso.code !== undefined) {
			const recebido = (JSON.parse(texto) as { error?: { code?: string } }).error
				?.code;
			if (recebido !== caso.code) {
				problemas.push(`code ${recebido} !== ${caso.code}`);
			}
		}

		if (caso.mensagem !== undefined) {
			const recebido = (
				JSON.parse(texto) as { error?: { message?: string } }
			).error?.message;
			if (recebido !== caso.mensagem) {
				problemas.push(`mensagem ${JSON.stringify(recebido)}`);
			}
		}

		if (problemas.length === 0) {
			console.log(`ok   ${caso.nome}`);
			continue;
		}

		falhas += 1;
		console.log(`FALHA ${caso.nome}`);
		for (const problema of problemas) console.log(`       ${problema}`);
	}

	console.error = logOriginal;
	console.log(`\n${casos.length - falhas}/${casos.length} passaram`);
	process.exit(falhas === 0 ? 0 : 1);
}

void run();
