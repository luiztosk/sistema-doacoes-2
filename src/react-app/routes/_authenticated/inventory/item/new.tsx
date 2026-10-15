import { createFileRoute } from "@tanstack/react-router";

import { InventoryItemForm } from "@/react-app/components/forms/inventory/item";
import { createItemMutation } from "@/react-app/lib/queries/inventory/items";
import { categoriesOptions } from "@/react-app/lib/queries/inventory/categories";
import { useQuery } from "@tanstack/react-query";
import { CategorySelect } from "@/schemas/zod/inventory";

function NewItemPage() {
	const { mutateAsync: createMutateAsync, isPending: createIsPending } = createItemMutation();
	const categories = useQuery(categoriesOptions);
	if (categories.isLoading) {
		return <div>Loading...</div>;
	}
	if (categories.isError) {
		return <div>Error: {String(categories.error)}</div>;
	}
	return <InventoryItemForm
		createMutateAsync={createMutateAsync}
		createIsPending={createIsPending}
		categories={categories.data as CategorySelect[]}
	/>;
}

export const Route = createFileRoute("/_authenticated/inventory/item/new")({
	loader: ({ context }) => {
		context.queryClient.query({ ...categoriesOptions });
	},
	component: NewItemPage,
});
