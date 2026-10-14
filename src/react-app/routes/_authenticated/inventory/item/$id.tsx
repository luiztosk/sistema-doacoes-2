import { createFileRoute } from "@tanstack/react-router";

import { InventoryItemForm } from "@/react-app/components/forms/inventory/item";
import { Spinner } from "@/react-app/components/ui/spinner";
import { categoriesOptions, itemOptions } from "@/react-app/lib/queries/inventory";
import { useQuery } from "@tanstack/react-query";
import { InventoryItemSelect, ItemCategorySelect } from "@/schemas/zod/inventory";

function ItemPage() {
	const { id } = Route.useParams();
	const item = useQuery(itemOptions(id))
	const categories = useQuery(categoriesOptions)

	if (item.isLoading || categories.isLoading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando item...
			</div>
		);
	}

	if (item.isError || categories.isError) {
		return <p>Não foi possível carregar o item.</p>;
	}

	return <InventoryItemForm 
		item={item.data as InventoryItemSelect}
		categories={categories.data as ItemCategorySelect[]}
	/>;
}

export const Route = createFileRoute("/_authenticated/inventory/item/$id")({
	loader: ({ context, params }) => {
		context.queryClient.query(itemOptions(params.id))
		context.queryClient.query(categoriesOptions)
	},
	component: ItemPage,
});
