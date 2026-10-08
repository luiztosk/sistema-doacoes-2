import { Link, createFileRoute } from "@tanstack/react-router";

import { InventoryItemsTable } from "@/react-app/components/tables/inventory-items";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { InventoryItemTableView, inventoryItemTableViewSchema } from "@/schemas/zod/inventory";

function InventoryItems() {
	// const view = Route.useSearch();
	const { isPending, error, data } = useQuery({
		queryKey: ["inventory-items"],
		queryFn: () => {
			fetch("/api/v1/inventory-items").then((res) =>
				// inventoryItemTableViewSchema.array().parse(res.json()) as Array<InventoryItemTableView>,
				res.json(),
			);
		},
	});
	
	if (isPending) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error: {error.message}</div>;
	}

	return (
		<div> table fetched: {data.toString()}</div>
		// <section className="space-y-4">
		// 	<div className="flex flex-wrap items-center justify-between gap-4">
		// 		<h1 className="text-3xl font-bold">Itens de estoque</h1>
		// 		<Link
		// 			to="/inventory-items/new"
		// 			className={buttonVariants({ size: "sm" })}
		// 		>
		// 			Novo item
		// 		</Link>
		// 	</div>
		// 	<InventoryItemsTable data={data} />
		// </section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory-items/")({
	validateSearch: tableViewSchema,
	component: InventoryItems,
});
