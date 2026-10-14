import { createFileRoute } from "@tanstack/react-router";

import { InventoryItemForm } from "@/react-app/components/forms/inventory-item";
import { Spinner } from "@/react-app/components/ui/spinner";
import { inventoryItemQuery, updateInventoryItemMutation } from "@/react-app/lib/queries/inventory/items";

function EditarInventoryItem() {
	const { id } = Route.useParams();
	const { data, isPending, isError } = inventoryItemQuery(id);
	const update = updateInventoryItemMutation();

	if (isPending) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando item...
			</div>
		);
	}

	if (isError) {
		return <p>Não foi possível carregar o item.</p>;
	}

	return <InventoryItemForm inventoryItem={data.item} updateMutation={update} />;
}

export const Route = createFileRoute("/_authenticated/inventory/items/id/$id")({
	component: EditarInventoryItem,
});
