import { Link, createFileRoute } from "@tanstack/react-router";

import { InventoryItemsTable } from "@/react-app/components/tables/inventory-items";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import { inventoryItemsQuery } from "@/react-app/lib/queries/inventory/items";
import type { InventoryItemTableView, ItemCategorySelect } from "@/schemas/zod/inventory";
import { queryClient } from "@/react-app/lib/query-client";
import { $api } from "@/react-app/lib/queries/fetch-client";
import { useQuery } from "@tanstack/react-query";

const inventoryItemsOptions = $api.queryOptions(
	"get", "/api/v1/inventory/items"
)
const categoriesOptions = $api.queryOptions(
	"get", "/api/v1/inventory/categories"
)

// const inventoryItemsQuery = (): UseQueryResult<InventoryItemTableView[]> =>
// 	$api.useQuery("get", "/api/v1/inventory/items");

// const query = inventoryItemsQuery()
function ItemsTable() {
	const { isLoading, isError, error, data: items } = useQuery(inventoryItemsOptions)
	const { isLoading: isLoadingCats, data: categories } = useQuery(categoriesOptions)
	if (isLoading || isLoadingCats) {
		return <div>Loading...{isLoading}</div>;
	}

	if (isError) {
		return <div>Error: {String(error)}</div>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Inventory Items</h1>
				<Link
					to="/inventory/items/new"
					className={buttonVariants({ size: "sm" })}
				>
					New item
				</Link>
			</div>
			<InventoryItemsTable
				items={items as InventoryItemTableView[]}
				categories={categories as ItemCategorySelect[]}
			/>
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/items/")({
	// validateSearch: tableViewSchema,
	loader: ({ context }) =>
		context.queryClient.query({ ...inventoryItemsOptions }),
	component: ItemsTable,
});
