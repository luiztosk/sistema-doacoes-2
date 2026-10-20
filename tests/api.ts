import { HTTPException } from "hono/http-exception";
import { app } from "../src/worker/app";
import { apiRoutes } from "../src/worker/routes";
import { handleApiError } from "../src/worker/api/errors";

/**
 * A API inteira, sem D1: as rotas rodam de verdade, e o banco é um stub que
 * ou responde com linhas ou falha do jeito que o D1 falha. O que se prova aqui
 * é o **contrato** — o envelope, os códigos de erro e as regras de validação.
 * As operações de estoque, que dependem do trigger, são de
 * `tests/inventory.ts`, contra o D1 local.
 *
 * Rode com `npm test`.
 */

class DbError extends Error {
	override name = "DbError";
}

type Row = Record<string, unknown>;

type CorpoResposta = {
	data?: unknown;
	error?: { code?: string; message?: string };
};

/**
 * As colunas que a consulta pediu, em ordem, para que a fixture possa ser
 * escrita como um objeto com o nome da coluna: `select "id", "name" …` e
 * `… returning "id"` são as duas formas que esta API produz.
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

	const prepare = (sql: string) => {
		const columns = selectedColumns(sql);
		const stmt = {
			bind: () => stmt,
			raw: async () => {
				if (opts.dbError) fail();
				return rows.map((row) =>
					columns.map((column) => row[column] ?? null),
				);
			},
			all: async () => {
				if (opts.dbError) fail();
				return { results: rows, success: true, meta: { changes: rows.length } };
			},
			first: async () => {
				if (opts.dbError) fail();
				return rows[0] ?? null;
			},
			run: async () => {
				if (opts.dbError) fail();
				return { success: true, meta: { changes: rows.length } };
			},
		};

		return stmt;
	};

	return {
		prod_sistema_doacoes_2: {
			prepare,
			batch: async () => {
				if (opts.dbError) fail();
				return rows.map(() => ({
					results: rows,
					success: true,
					meta: { changes: rows.length },
				}));
			},
		},
	};
}

app.openapiRoutes(apiRoutes);
app.get("/sem-sessao", () => {
	throw new HTTPException(401);
});
app.onError(handleApiError);

const ID = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";

const BENEFICIARIO: Row = {
	id: ID,
	name: "Ana",
	phone: "+5511999999999",
	email: null,
	cep: null,
	logradouro: null,
	numero: null,
	complemento: null,
	bairro: "Centro",
	cidade: "São Paulo",
	uf: "SP",
	tipo_imovel: null,
	valor_aluguel: null,
	estado_civil: null,
	numero_adultos: null,
	criancas_pequenas: null,
	adolescentes: null,
	doentes: null,
	bolsa_familia: null,
	aposentado: null,
	pensao: null,
	cesta_basica: null,
	atividade_remunerada: null,
	renda: null,
	crianca_escola: null,
	observacoes: null,
};

const BENEFICIARIO_VALIDO = {
	name: "Ana",
	phone: "+5511999999999",
	bairro: "Centro",
	cidade: "São Paulo",
	uf: "SP",
};

const ITEM: Row = {
	id: ID,
	name: "Arroz 5kg",
	category_id: ID2,
	unit: "KG",
	on_hand: 0,
	reserved: 0,
	available: 0,
};

type Caso = {
	nome: string;
	method: string;
	path: string;
	body?: unknown;
	rawBody?: string;
	contentType?: string;
	rows?: Row[];
	dbError?: string;
	status: number;
	code?: string;
	mensagem?: string;
	semCorpo?: boolean;
	location?: string;
};

const casos: Caso[] = [
	{
		nome: "body sem o campo obrigatório",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: {},
		status: 400,
		code: "REQUIRED_FIELD",
		mensagem: "Field 'name' is required.",
	},
	{
		nome: "null conta como ausente",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: { ...BENEFICIARIO_VALIDO, name: null },
		status: 400,
		code: "REQUIRED_FIELD",
		mensagem: "Field 'name' is required.",
	},
	{
		nome: "nome em branco",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: { ...BENEFICIARIO_VALIDO, name: "   " },
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'name' has an invalid value.",
	},
	{
		nome: "telefone fora do E.164",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: { ...BENEFICIARIO_VALIDO, phone: "11999999999" },
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'phone' has an invalid value.",
	},
	{
		nome: "uf fora do enum",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: { ...BENEFICIARIO_VALIDO, uf: "sp" },
		status: 400,
		code: "INVALID_VALUE",
		mensagem:
			"Field 'uf' must be one of: AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO.",
	},
	{
		nome: "cep com traço",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: { ...BENEFICIARIO_VALIDO, cep: "01310-100" },
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'cep' has an invalid value.",
	},
	{
		nome: "campo desconhecido",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: { ...BENEFICIARIO_VALIDO, apelido: "Ana" },
		status: 400,
		code: "UNKNOWN_FIELD",
		mensagem: "Field 'apelido' is not accepted in this resource.",
	},
	{
		nome: "id no corpo",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: { ...BENEFICIARIO_VALIDO, id: ID },
		status: 400,
		code: "READ_ONLY_FIELD",
		mensagem: "Field 'id' is set by the server.",
	},
	{
		nome: "patch sem nenhum campo",
		method: "PATCH",
		path: `/api/v1/beneficiaries/${ID}`,
		body: {},
		status: 400,
		code: "EMPTY_UPDATE",
		mensagem: "Send at least one field to update.",
	},
	{
		nome: "patch com id no corpo",
		method: "PATCH",
		path: `/api/v1/beneficiaries/${ID}`,
		body: { id: ID, name: "Ana" },
		status: 400,
		code: "READ_ONLY_FIELD",
		mensagem: "Field 'id' is set by the server.",
	},
	{
		nome: "saldo no corpo do item",
		method: "POST",
		path: "/api/v1/inventory/items",
		body: { name: "Arroz", categoryId: ID2, unit: "KG", onHand: 10 },
		status: 400,
		code: "UNKNOWN_FIELD",
		mensagem: "Field 'onHand' is not accepted in this resource.",
	},
	{
		nome: "status no corpo da doação",
		method: "POST",
		path: "/api/v1/donations",
		body: {
			donorId: ID,
			occurredAt: "2026-10-01T12:00:00Z",
			status: "RECEIVED",
			items: [{ itemId: ID2, quantity: 1 }],
		},
		status: 400,
		code: "UNKNOWN_FIELD",
		mensagem: "Field 'status' is not accepted in this resource.",
	},
	{
		nome: "motivo que o cliente não manda",
		method: "POST",
		path: "/api/v1/inventory-adjustments",
		body: {
			itemId: ID,
			delta: 1,
			reason: "CORRECTION",
			occurredAt: "2026-10-01T12:00:00Z",
		},
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'reason' must be one of: DONOR_RETURN, LOSS, DAMAGE.",
	},
	{
		nome: "o mesmo item duas vezes na mesma doação",
		method: "POST",
		path: "/api/v1/donations",
		body: {
			donorId: ID,
			occurredAt: "2026-10-01T12:00:00Z",
			items: [
				{ itemId: ID, quantity: 1 },
				{ itemId: ID, quantity: 2 },
			],
		},
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "An item cannot appear twice in the same donation.",
	},
	{
		nome: "doação sem itens",
		method: "POST",
		path: "/api/v1/donations",
		body: {
			donorId: ID,
			occurredAt: "2026-10-01T12:00:00Z",
			items: [],
		},
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'items' has an invalid value.",
	},
	{
		nome: "quantidade zero",
		method: "POST",
		path: "/api/v1/donations",
		body: {
			donorId: ID,
			occurredAt: "2026-10-01T12:00:00Z",
			items: [{ itemId: ID, quantity: 0 }],
		},
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'items.0.quantity' has an invalid value.",
	},
	{
		nome: "id que não é uuid",
		method: "GET",
		path: "/api/v1/beneficiaries/nao-e-uuid",
		status: 400,
		code: "INVALID_VALUE",
		mensagem: "Field 'id' has an invalid value.",
	},
	{
		nome: "content-type errado",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: BENEFICIARIO_VALIDO,
		contentType: "text/plain",
		status: 415,
		code: "UNSUPPORTED_MEDIA_TYPE",
		mensagem: "Send the body as application/json.",
	},
	{
		nome: "json malformado",
		method: "POST",
		path: "/api/v1/beneficiaries",
		rawBody: "{ nao é json",
		status: 400,
		code: "INVALID_JSON",
		mensagem: "The JSON sent is invalid.",
	},
	{
		nome: "json que não é objeto",
		method: "POST",
		path: "/api/v1/beneficiaries",
		rawBody: "[1, 2, 3]",
		status: 400,
		code: "INVALID_BODY",
		mensagem: "The request body must be a JSON object.",
	},
	{
		nome: "rota inexistente",
		method: "GET",
		path: "/api/v1/nao-existe",
		status: 404,
		code: "NOT_FOUND",
		mensagem: "Route not found.",
	},
	{
		nome: "registro inexistente",
		method: "GET",
		path: `/api/v1/beneficiaries/${ID}`,
		status: 404,
		code: "NOT_FOUND",
		mensagem: "Beneficiary not found.",
	},
	{
		nome: "sem sessão",
		method: "GET",
		path: "/sem-sessao",
		status: 401,
		semCorpo: true,
	},
	{
		nome: "violação de referência",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: BENEFICIARIO_VALIDO,
		dbError: "FOREIGN KEY constraint failed",
		status: 400,
		code: "INVALID_REFERENCE",
		mensagem: "One of the references sent does not exist.",
	},
	{
		nome: "violação de unicidade",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: BENEFICIARIO_VALIDO,
		dbError: "UNIQUE constraint failed: beneficiary.name",
		status: 409,
		code: "CONFLICT",
		mensagem: "A record with that value already exists.",
	},
	{
		nome: "a guarda do estoque",
		method: "POST",
		path: "/api/v1/deliveries",
		body: {
			beneficiaryId: ID,
			occurredAt: "2026-10-01T12:00:00Z",
			items: [{ itemId: ID2, quantity: 1 }],
		},
		dbError:
			"INSUFFICIENT_STOCK: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_TRIGGER)",
		status: 409,
		code: "INSUFFICIENT_STOCK",
		mensagem: "There is not enough stock for this operation.",
	},
	{
		nome: "criação devolve 201 e o Location",
		method: "POST",
		path: "/api/v1/beneficiaries",
		body: BENEFICIARIO_VALIDO,
		rows: [BENEFICIARIO],
		status: 201,
		location: `/api/v1/beneficiaries/${ID}`,
	},
	{
		nome: "atualização devolve 200",
		method: "PATCH",
		path: `/api/v1/beneficiaries/${ID}`,
		body: { name: "Ana Maria" },
		rows: [BENEFICIARIO],
		status: 200,
	},
	{
		nome: "exclusão devolve 204 sem corpo",
		method: "DELETE",
		path: `/api/v1/beneficiaries/${ID}`,
		rows: [BENEFICIARIO],
		status: 204,
		semCorpo: true,
	},
	{
		nome: "a lista vem no envelope",
		method: "GET",
		path: "/api/v1/beneficiaries",
		rows: [BENEFICIARIO],
		status: 200,
	},
	{
		nome: "o item responde com o saldo",
		method: "GET",
		path: "/api/v1/inventory/items",
		rows: [ITEM],
		status: 200,
	},
];

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

async function main() {
	for (const caso of casos) {
		const env = stubEnv({
			rows: caso.rows,
			dbError: caso.dbError,
		});

		const res = await app.request(
			caso.path,
			{
				method: caso.method,
				headers: {
					"content-type": caso.contentType ?? "application/json",
				},
				body:
					caso.rawBody ??
					(caso.body === undefined ? undefined : JSON.stringify(caso.body)),
			},
			env as never,
		);

		const texto = await res.text();
		let body: CorpoResposta | null = null;
		try {
			body = texto ? (JSON.parse(texto) as CorpoResposta) : null;
		} catch {
			body = null;
		}

		const okStatus = res.status === caso.status;
		check(
			`${caso.nome}: status`,
			okStatus,
			okStatus ? "" : `esperado ${caso.status}, veio ${res.status} — ${texto}`,
		);

		if (caso.semCorpo) {
			check(
				`${caso.nome}: sem corpo`,
				texto === "",
				texto ? `veio ${texto}` : "",
			);
			continue;
		}

		if (caso.code) {
			igual(
				`${caso.nome}: código`,
				caso.code,
				body?.error?.code ?? null,
			);
		}

		if (caso.mensagem) {
			igual(
				`${caso.nome}: mensagem`,
				caso.mensagem,
				body?.error?.message ?? null,
			);
		}

		if (caso.location) {
			igual(
				`${caso.nome}: Location`,
				caso.location,
				res.headers.get("location"),
			);
		}

		if (!caso.code && !caso.semCorpo) {
			check(
				`${caso.nome}: envelope com data`,
				body !== null && "data" in body,
				texto,
			);
		}
	}
}

await main();

console.log(
	failures === 0
		? "\nTODAS AS VERIFICACOES PASSARAM"
		: `\n${failures} FALHARAM`,
);
process.exit(failures === 0 ? 0 : 1);
