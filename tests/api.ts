import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { handleApiError } from "../src/worker/api/errors";
import { registerResources } from "../src/worker/api/v1";
import type { AppEnv } from "../src/worker/env";
import { requireOrganization } from "../src/worker/organization-middleware";

/**
 * The API driven end to end without a D1: every route runs for real, and the
 * database is a stub that either answers with rows or fails the way D1 fails.
 * Run with `npm test`.
 */

class DbError extends Error {
	override name = "DbError";
}

type Row = Record<string, unknown>;
type Query = { sql: string; bindings: unknown[] };

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

function stubEnv(
	opts: { dbError?: string; queries?: Query[]; rows?: Row[] } = {},
) {
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
				let bindings: unknown[] = [];
				const recordQuery = () =>
					opts.queries?.push({ sql, bindings: [...bindings] });
				const stmt = {
					bind: (...values: unknown[]) => {
						bindings = values;
						return stmt;
					},
					raw: async () => {
						recordQuery();
						if (opts.dbError) fail();
						return rows.map((row) =>
							columns.map((column) => row[column] ?? null),
						);
					},
					run: async () => {
						recordQuery();
						if (opts.dbError) fail();
						return { success: true };
					},
				};

				return stmt;
			},
		},
	};
}

const app = new Hono<AppEnv>();
const api = new Hono<AppEnv>();
registerResources(api);
app.use("/api/v1/*", async (c, next) => {
	c.set("organization", {
		id: "org-a",
		memberId: "member-a",
		role: c.req.header("x-test-role") ?? "member",
	});
	await next();
});
app.route("/api/v1", api);
app.get("/sem-sessao", () => {
	throw new HTTPException(401);
});
app.onError(handleApiError);

const ASSISTIDO: Row = {
	id: "1",
	organization_id: "org-a",
	nome: "Ana",
	renda: 0,
};
const ITEM: Row = {
	id: "1",
	organization_id: "org-a",
	nome_id: "n1",
	status: "AGUARDA_COLETA",
};
const ITEM_EM_ESTOQUE: Row = { ...ITEM, status: "EM_ESTOQUE" };

type Caso = {
	nome: string;
	method: string;
	path: string;
	body?: unknown;
	contentType?: string;
	rows?: Row[];
	dbError?: string;
	role?: string;
	status: number;
	code?: string;
	mensagem?: string;
	semCorpo?: boolean;
	verificarConsultas?: (queries: Query[]) => string | undefined;
};

const casos: Caso[] = [
	{
		nome: "lista filtrada pela organização ativa",
		method: "GET",
		path: "/api/v1/assistidos",
		rows: [ASSISTIDO],
		status: 200,
		verificarConsultas: (queries) => {
			const query = queries[0];
			if (!query?.sql.includes('"organization_id"')) {
				return "query sem filtro de organization_id";
			}
			if (!query.bindings.includes("org-a")) {
				return "organization ativa não foi enviada ao banco";
			}
		},
	},
	{
		nome: "organizationId é somente do servidor",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana", organizationId: "org-b" },
		status: 400,
		code: "UNKNOWN_FIELD",
		mensagem: "Field 'organizationId' is not accepted in this resource.",
	},
	{
		nome: "criação injeta a organização ativa",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana" },
		rows: [ASSISTIDO],
		status: 201,
		verificarConsultas: (queries) => {
			const insert = queries.find((query) =>
				query.sql.toLowerCase().startsWith('insert into "assistido"'),
			);
			if (!insert?.sql.includes('"organization_id"')) {
				return "insert sem organization_id";
			}
			if (!insert.bindings.includes("org-a")) {
				return "insert sem a organização ativa";
			}
		},
	},
	{
		nome: "ID de outro tenant é tratado como inexistente",
		method: "GET",
		path: "/api/v1/assistidos/id-do-outro-tenant",
		rows: [],
		status: 404,
		code: "NOT_FOUND",
		mensagem: "Assistido not found.",
		verificarConsultas: (queries) => {
			const query = queries[0];
			if (!query?.sql.includes('"organization_id"')) {
				return "busca por ID sem filtro de organization_id";
			}
			if (
				!query.bindings.includes("org-a") ||
				!query.bindings.includes("id-do-outro-tenant")
			) {
				return "busca por ID sem tenant e id nos bindings";
			}
		},
	},
	{
		nome: "viewer não pode alterar registros",
		method: "POST",
		path: "/api/v1/assistidos",
		body: { nome: "Ana" },
		role: "viewer",
		status: 403,
		code: "FORBIDDEN",
		mensagem: "Your role cannot change records in this organization.",
	},
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
		nome: "referência de outro tenant é recusada no POST",
		method: "POST",
		path: "/api/v1/coletas",
		body: { doadorId: "nao-existe" },
		status: 400,
		code: "INVALID_REFERENCE",
		mensagem:
			"One of the references sent does not exist in the active organization.",
		verificarConsultas: (queries) => {
			const query = queries[0];
			if (!query?.sql.includes('"organization_id"')) {
				return "validação da referência sem organization_id";
			}
			if (!query.bindings.includes("org-a")) {
				return "validação da referência sem a organização ativa";
			}
		},
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
		const queries: Query[] = [];
		const res = await app.request(
			caso.path,
			{
				method: caso.method,
				headers: {
					"content-type": caso.contentType ?? "application/json",
					...(caso.role ? { "x-test-role": caso.role } : {}),
				},
				body: caso.body === undefined ? undefined : JSON.stringify(caso.body),
			},
			stubEnv({
				dbError: caso.dbError,
				queries,
				rows: caso.rows,
			}) as never,
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

		const problemaConsulta = caso.verificarConsultas?.(queries);
		if (problemaConsulta) problemas.push(problemaConsulta);

		if (problemas.length === 0) {
			console.log(`ok   ${caso.nome}`);
			continue;
		}

		falhas += 1;
		console.log(`FALHA ${caso.nome}`);
		for (const problema of problemas) console.log(`       ${problema}`);
	}

	type OrganizationCase = {
		nome: string;
		activeOrganizationId: string | null;
		rows?: Row[];
		status: number;
		code?: string;
	};

	const organizationCases: OrganizationCase[] = [
		{
			nome: "organização ativa é obrigatória",
			activeOrganizationId: null,
			status: 403,
			code: "ORGANIZATION_REQUIRED",
		},
		{
			nome: "usuário precisa pertencer à organização ativa",
			activeOrganizationId: "org-a",
			rows: [],
			status: 403,
			code: "ORGANIZATION_FORBIDDEN",
		},
		{
			nome: "membership válida carrega o tenant",
			activeOrganizationId: "org-a",
			rows: [{ id: "member-a", role: "admin" }],
			status: 200,
		},
	];

	for (const caso of organizationCases) {
		const organizationApp = new Hono<AppEnv>();
		organizationApp.use("*", async (c, next) => {
			c.set(
				"session",
				{
					session: { activeOrganizationId: caso.activeOrganizationId },
					user: { id: "user-a" },
				} as never,
			);
			await next();
		});
		organizationApp.use("*", requireOrganization);
		organizationApp.get("/", (c) => c.json(c.get("organization")));
		organizationApp.onError(handleApiError);

		const res = await organizationApp.request(
			"/",
			{},
			stubEnv({ rows: caso.rows }) as never,
		);
		const texto = await res.text();
		const problemas: string[] = [];

		if (res.status !== caso.status) {
			problemas.push(`status ${res.status} !== ${caso.status}`);
		}

		if (caso.code) {
			const recebido = (JSON.parse(texto) as { error?: { code?: string } })
				.error?.code;
			if (recebido !== caso.code) {
				problemas.push(`code ${recebido} !== ${caso.code}`);
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
	const total = casos.length + organizationCases.length;
	console.log(`\n${total - falhas}/${total} passaram`);
	process.exit(falhas === 0 ? 0 : 1);
}

void run();
