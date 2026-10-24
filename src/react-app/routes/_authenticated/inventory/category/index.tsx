import { tableViewSchemaFor } from "@/react-app/components/tables/utils/table-view-state";
import { Link, createFileRoute } from "@tanstack/react-router";

import { ItemCategoriesTable } from "@/react-app/components/tables/inventory/categories";
import { buttonVariants } from "@/react-app/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { categoriesOptions } from "@/react-app/lib/queries/inventory/categories";

function CategoriesTablePage() {
	const view = Route.useSearch();
	const categories = useQuery(categoriesOptions);

	if (categories.isLoading) {
		return <div>Carregando...</div>;
	}

	if (categories.isError) {
		return <p>Não foi possível carregar as categorias.</p>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Categorias de item</h1>
				<Link
					to="/inventory/category/new"
					className={buttonVariants({ size: "sm" })}
				>
					Nova categoria
				</Link>
			</div>
			<ItemCategoriesTable data={categories.data ?? []} view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/category/")({
	validateSearch: tableViewSchemaFor("/inventory/category"),
	loader: ({ context }) => {
		context.queryClient.query({ ...categoriesOptions });
	},
	component: CategoriesTablePage,
});
