import { Link, createFileRoute } from "@tanstack/react-router";

import { ItemCategoriesTable } from "@/react-app/components/tables/item-categories";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import { itemCategoriesQuery } from "@/react-app/lib/queries/inventory/categories";
import type { ItemCategorySelect } from "@/schemas/zod/inventory";


function ItemCategories() {
	const { isPending, isError, data, error } = itemCategoriesQuery()
	if (isPending) {
		return <div>Loading...</div>;
	}

	if (isError) {
		return <div>Error: {String(error)}</div>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Item Categories</h1>
				<Link
					to="/inventory/categories/new"
					className={buttonVariants({ size: "sm" })}
				>
					New category
				</Link>
			</div>
			<ItemCategoriesTable data={data as ItemCategorySelect[]} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/categories/")({
	validateSearch: tableViewSchema,
	component: ItemCategories,
});