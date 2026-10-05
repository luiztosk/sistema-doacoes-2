import { Link, createFileRoute } from "@tanstack/react-router";

import { ItemCategoriesTable } from "@/react-app/components/tables/item-categories";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";

function ItemCategories() {
	const view = Route.useSearch();

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Categorias de item</h1>
				<Link
					to="/item-categories/novo"
					className={buttonVariants({ size: "sm" })}
				>
					Nova categoria
				</Link>
			</div>
			<ItemCategoriesTable view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/item-categories/")({
	validateSearch: tableViewSchema,
	component: ItemCategories,
});
