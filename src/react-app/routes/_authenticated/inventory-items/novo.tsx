import { createFileRoute } from "@tanstack/react-router";

import { InventoryItemForm } from "@/react-app/components/forms/inventory-item";

function NovoInventoryItem() {
	return <InventoryItemForm />;
}

export const Route = createFileRoute("/_authenticated/inventory-items/novo")({
	component: NovoInventoryItem,
});
