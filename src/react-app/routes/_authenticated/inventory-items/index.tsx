import { Link, createFileRoute } from "@tanstack/react-router";

import { InventoryItemsTable } from "@/react-app/components/tables/inventory-items";
import { tableViewSchema } from "@/react-app/components/tables/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";

function InventoryItems() {
	const view = Route.useSearch();

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Itens de estoque</h1>
				<Link
					to="/inventory-items/novo"
					className={buttonVariants({ size: "sm" })}
				>
					Novo item
				</Link>
			</div>
			<InventoryItemsTable view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory-items/")({
	validateSearch: tableViewSchema,
	component: InventoryItems,
});
