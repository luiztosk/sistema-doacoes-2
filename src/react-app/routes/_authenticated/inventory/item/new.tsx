import { createFileRoute } from "@tanstack/react-router";

import { InventoryItemForm } from "@/react-app/components/forms/inventory/item";
import { createInventoryItemMutation } from "@/react-app/lib/queries/inventory/items";

function NewInventoryItem() {
	const create = createInventoryItemMutation();
	return <InventoryItemForm createMutation={create} />;
}

export const Route = createFileRoute("/_authenticated/inventory/item/new")({
	component: NewInventoryItem,
});
