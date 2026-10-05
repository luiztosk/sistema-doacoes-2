import { createFileRoute } from "@tanstack/react-router";

import { ItemCategoryForm } from "@/react-app/components/forms/item-category";

function NovoItemCategory() {
	return <ItemCategoryForm />;
}

export const Route = createFileRoute("/_authenticated/item-categories/novo")({
	component: NovoItemCategory,
});
