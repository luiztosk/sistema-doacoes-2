import { Link, createFileRoute } from "@tanstack/react-router";

import { ItemsTable } from "@/react-app/components/tables/inventory/item";
// import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
// import { inventoryItemsQuery } from "@/react-app/lib/queries/inventory/items";
import type { InventoryItemTableView, ItemCategorySelect } from "@/schemas/zod/inventory";
// import { queryClient } from "@/react-app/lib/query-client";
// import { $api } from "@/react-app/lib/queries/fetch-client";
import { useQuery } from "@tanstack/react-query";
import { categoriesOptions, itemsOptions } from "@/react-app/lib/queries/inventory";

// const inventoryItemsQuery = (): UseQueryResult<InventoryItemTableView[]> =>
// 	$api.useQuery("get", "/api/v1/inventory/items");

// const query = inventoryItemsQuery()
function ItemsTablePage() {
	const items = useQuery(itemsOptions)
	const categories = useQuery(categoriesOptions)
	if (items.isLoading || categories.isLoading) {
		return <div>Loading...</div>;
	}

	if (items.isError || categories.isError) {
		return <div>Error: {String(items.error) + String(categories.error)}</div>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Inventory Items</h1>
				<Link
					to="/inventory/item/new"
					className={buttonVariants({ size: "sm" })}
				>
					New item
				</Link>
			</div>
			<ItemsTable
				items={items.data as InventoryItemTableView[]}
				categories={categories.data as ItemCategorySelect[]}
			/>
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/item/")({
	// validateSearch: tableViewSchema,
	loader: ({ context }) => {
		context.queryClient.query({ ...itemsOptions })
		context.queryClient.query({ ...categoriesOptions })
	},
	component: ItemsTablePage,
});
