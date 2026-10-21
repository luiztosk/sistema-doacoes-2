import { createFileRoute } from "@tanstack/react-router";

import { InventoryItemForm } from "@/react-app/components/forms/inventory/item";
import { categoriesOptions } from "@/react-app/lib/queries/inventory/categories";
import { useQuery } from "@tanstack/react-query";

function NewItemPage() {
	const categories = useQuery(categoriesOptions);
	if (categories.isLoading) {
		return <div>Carregando...</div>;
	}
	if (categories.isError) {
		return <p>Não foi possível carregar as categorias.</p>;
	}
	return <InventoryItemForm categories={categories.data ?? []} />;
}

export const Route = createFileRoute("/_authenticated/inventory/item/new")({
	loader: ({ context }) => {
		context.queryClient.query({ ...categoriesOptions });
	},
	component: NewItemPage,
});
