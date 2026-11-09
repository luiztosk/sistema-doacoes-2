import { tableViewSchemaFor } from "@/react-app/components/tables/utils/table-view-state";
import { Link, createFileRoute } from "@tanstack/react-router";

import { ItemsTable } from "@/react-app/components/tables/inventory/item";
import { buttonVariants } from "@/react-app/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { categoriesOptions } from "@/react-app/lib/queries/inventory/categories";
import { itemsOptions } from "@/react-app/lib/queries/inventory/items";

function ItemsTablePage() {
	const view = Route.useSearch();
	const items = useQuery(itemsOptions);
	const categories = useQuery(categoriesOptions);
	if (items.isLoading || categories.isLoading) {
		return <div>Carregando...</div>;
	}

	if (items.isError || categories.isError) {
		return <p>Não foi possível carregar os itens.</p>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Itens de estoque</h1>
				<Link
					to="/inventory/item/new"
					className={buttonVariants({ size: "sm" })}
				>
					Novo item
				</Link>
			</div>
			<ItemsTable
				items={items.data ?? []} view={view}
				categories={categories.data ?? []}
			/>
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/item/")({
	validateSearch: tableViewSchemaFor("/inventory/item"),
	loader: ({ context }) => {
		context.queryClient.query({ ...itemsOptions });
		context.queryClient.query({ ...categoriesOptions });
	},
	component: ItemsTablePage,
});
