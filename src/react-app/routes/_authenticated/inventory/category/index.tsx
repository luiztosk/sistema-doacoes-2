import { Link, createFileRoute } from "@tanstack/react-router";

import { ItemCategoriesTable } from "@/react-app/components/tables/inventory/categories";
// import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import type { ItemCategorySelect } from "@/schemas/zod/inventory";
import { useQuery } from "@tanstack/react-query";
import { categoriesOptions } from "@/react-app/lib/queries/inventory";


function CategoriesTablePage() {
	const categories = useQuery(categoriesOptions)
	if (categories.isLoading) {
		return <div>Loading...</div>;
	}

	if (categories.isError) {
		return <div>Error: {String(categories.error)}</div>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Item Categories</h1>
				<Link
					to="/inventory/category/new"
					className={buttonVariants({ size: "sm" })}
				>
					New category
				</Link>
			</div>
			<ItemCategoriesTable data={categories.data as ItemCategorySelect[]} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/category/")({
	// validateSearch: tableViewSchema,
	loader: ({ context }) => {
		context.queryClient.query({ ...categoriesOptions })
	},
	component: CategoriesTablePage,
});