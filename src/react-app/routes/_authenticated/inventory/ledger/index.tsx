import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { tableViewSchemaFor } from "@/react-app/components/tables/utils/table-view-state";

import { LedgerTable } from "@/react-app/components/tables/inventory/ledger";
import { ledgerOptions } from "@/react-app/lib/queries/inventory/ledger";

const ledgerViewSchema = tableViewSchemaFor("/inventory/ledger");

const defaultPageSize = 50;

function Ledger() {
	const view = Route.useSearch();
	const navigate = useNavigate();

	useEffect(() => {
		if (!view.sort) navigate({ to: "/inventory/ledger", search: { ...view, sort: "seq.asc" }, replace: true });
	}, [navigate, view]);

	const page = view.page ?? 0;
	const pageSize = view.pageSize ?? defaultPageSize;

	const ledger = useQuery(ledgerOptions({ page, pageSize }));

	const irPara = (next: { page?: number; pageSize?: number }) => {
		navigate({
			to: "/inventory/ledger",
			search: {
				sort: "seq.asc",
				page: next.page && next.page > 0 ? next.page : undefined,
				pageSize:
					next.pageSize && next.pageSize !== defaultPageSize
						? next.pageSize
						: undefined,
			},
			replace: true,
		});
	};

	if (ledger.isLoading) {
		return <div>Carregando...</div>;
	}

	if (ledger.isError) {
		return <p>Não foi possível carregar o histórico.</p>;
	}

	const pagina = ledger.data;

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Histórico do estoque</h1>
			</div>
			<LedgerTable
				entries={pagina?.items ?? []}
				page={page}
				pageSize={pageSize}
				total={pagina?.total ?? 0}
				onPageChange={(next) => irPara({ page: next, pageSize })}
				onPageSizeChange={(next) => irPara({ page: 0, pageSize: next })}
			/>
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/ledger/")({
	validateSearch: ledgerViewSchema,
	loader: ({ context }) => {
		context.queryClient.query({ ...ledgerOptions() });
	},
	component: Ledger,
});
