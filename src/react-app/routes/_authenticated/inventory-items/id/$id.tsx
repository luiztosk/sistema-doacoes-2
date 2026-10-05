import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { InventoryItemForm } from "@/react-app/components/forms/inventory-item";
import { Spinner } from "@/react-app/components/ui/spinner";
import { inventoryItemDetailOptions } from "@/react-app/lib/api/inventory-items";

function EditarInventoryItem() {
	const { id } = Route.useParams();
	const { data, isPending, isError } = useQuery(
		inventoryItemDetailOptions(id),
	);

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

	return <InventoryItemForm inventoryItem={data} />;
}

export const Route = createFileRoute("/_authenticated/inventory-items/id/$id")({
	component: EditarInventoryItem,
});
