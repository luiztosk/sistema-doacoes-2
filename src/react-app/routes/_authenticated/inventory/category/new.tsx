import { createFileRoute } from "@tanstack/react-router";

import { CategoryForm } from "@/react-app/components/forms/inventory/category";

function NewDelivery() {
	return <CategoryForm />;
}

export const Route = createFileRoute("/_authenticated/inventory/category/new")({
	component: NewDelivery,
});
