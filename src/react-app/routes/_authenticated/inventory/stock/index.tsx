import { tableViewSchemaFor } from "@/react-app/components/tables/utils/table-view-state";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { StockTable } from "@/react-app/components/tables/inventory/stock";
import { stockOptions } from "@/react-app/lib/queries/inventory/stock";

function Stock() {
	const view = Route.useSearch();
	const stock = useQuery(stockOptions);

	if (stock.isLoading) {
		return <div>Carregando...</div>;
	}

	if (stock.isError) {
		return <p>Não foi possível carregar o saldo.</p>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Saldo do estoque</h1>
			</div>
			<StockTable stock={stock.data ?? []} view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/stock/")({
	validateSearch: tableViewSchemaFor("/inventory/stock"),
	loader: ({ context }) => {
		context.queryClient.query({ ...stockOptions });
	},
	component: Stock,
});
