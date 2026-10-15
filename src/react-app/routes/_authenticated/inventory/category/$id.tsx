import { createFileRoute } from "@tanstack/react-router";

import { CategoryForm } from "@/react-app/components/forms/inventory/category";
import { Spinner } from "@/react-app/components/ui/spinner";
import { categoryOptions, updateCategoryMutation } from "@/react-app/lib/queries/inventory/categories";
import { useQuery } from "@tanstack/react-query";
import { CategorySelect } from "@/schemas/zod/inventory";

function CategoryPage() {
	const { id } = Route.useParams();
	const category = useQuery(categoryOptions(id));

	if (category.isLoading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando categoria...
			</div>
		);
	}

	if (category.isError) {
		return <p>Não foi possível carregar a categoria.</p>;
	}

	// The categoryOptions response type is not correctly inferred due to missing OpenAPI schema
	// Cast to the expected type
	// const categoryData = category.data as CategorySelect | undefined;

	return <CategoryForm
		itemCategory={category.data}
		updateMutation={updateCategoryMutation}
	/>;
}

export const Route = createFileRoute("/_authenticated/inventory/category/$id")({
	loader: ({ context, params }) => {
		context.queryClient.query({ ...categoryOptions(params.id) });
	},
	component: CategoryPage,
});
