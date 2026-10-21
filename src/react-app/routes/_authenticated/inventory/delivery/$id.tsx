import { createFileRoute } from "@tanstack/react-router";

import { DeliveryForm } from "@/react-app/components/forms/inventory/delivery";
import { Spinner } from "@/react-app/components/ui/spinner";
import { deliveryOptions } from "@/react-app/lib/queries/inventory/deliveries";
import { useQuery } from "@tanstack/react-query";

function DeliveryPage() {
	const { id } = Route.useParams();
	const { data, isLoading, isError, isSuccess } = useQuery(deliveryOptions(id));

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando entrega...
			</div>
		);
	}

	if (isError) {
		return <p>Não foi possível carregar a entrega.</p>;
	}

	if (isSuccess) {
		return <DeliveryForm delivery={data} />;
	}
}

export const Route = createFileRoute("/_authenticated/inventory/delivery/$id")({
	loader: ({ context, params }) => {
		context.queryClient.query(deliveryOptions(params.id));
	},
	component: DeliveryPage,
});
