import { Link, createFileRoute } from "@tanstack/react-router";

import { ItemsTable } from "@/react-app/components/tables/inventory/item";
import { buttonVariants } from "@/react-app/components/ui/button";
import type { ItemSelect, CategorySelect } from "@/schemas/zod/inventory";
import { useQuery } from "@tanstack/react-query";
import { categoriesOptions } from "@/react-app/lib/queries/inventory/items";
import { itemsOptions } from "@/react-app/lib/queries/inventory/items";

function ItemsTablePage() {
	const items = useQuery(itemsOptions);
	const categories = useQuery(categoriesOptions);
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
				items={items.data as ItemSelect[]}
				categories={categories.data as CategorySelect[]}
			/>
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/item/")({
	loader: ({ context }) => {
		context.queryClient.query({ ...itemsOptions });
		context.queryClient.query({ ...categoriesOptions });
	},
	component: ItemsTablePage,
});
