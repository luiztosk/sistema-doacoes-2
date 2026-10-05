import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ItemCategoryForm } from "@/react-app/components/forms/item-category";
import { Spinner } from "@/react-app/components/ui/spinner";
import { itemCategoryDetailOptions } from "@/react-app/lib/api/item-categories";

function EditarItemCategory() {
	const { id } = Route.useParams();
	const { data, isPending, isError } = useQuery(
		itemCategoryDetailOptions(id),
	);

	if (isPending) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando categoria...
			</div>
		);
	}

	if (isError) {
		return <p>Não foi possível carregar a categoria.</p>;
	}

	return <ItemCategoryForm itemCategory={data} />;
}

export const Route = createFileRoute("/_authenticated/item-categories/id/$id")({
	component: EditarItemCategory,
});
