import { $api, semEnvelope } from "../fetch-client";

export const ledgerKeys = {
	all: ["ledger"] as const,
};

export type LedgerQuery = {
	page?: number;
	pageSize?: number;
	itemId?: string;
	kind?: string;
};

/**
 * O ledger é a **única** tela que pagina no servidor: é a única tabela que
 * cresce sem limite, porque um histórico de movimentos tem uma linha por
 * operação, para sempre.
 */
export const ledgerOptions = (query: LedgerQuery = {}) =>
	$api.queryOptions(
		"get",
		"/api/v1/ledger",
		{
			params: {
				query: {
					page: query.page ?? 0,
					pageSize: query.pageSize ?? 50,
					...(query.itemId ? { itemId: query.itemId } : {}),
					...(query.kind ? { kind: query.kind as never } : {}),
				},
			},
		},
		{ select: (response) => semEnvelope(response) },
	);
