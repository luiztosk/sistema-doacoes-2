import { createFileRoute } from "@tanstack/react-router";

import { CategoryForm } from "@/react-app/components/forms/inventory/category";
import { createCategoryMutation } from "@/react-app/lib/queries/inventory/categories";

function NewCategory() {
	const create = createCategoryMutation();
	return <CategoryForm createMutation={create} />;
}

export const Route = createFileRoute("/_authenticated/inventory/category/new")({
	component: NewCategory,
});
