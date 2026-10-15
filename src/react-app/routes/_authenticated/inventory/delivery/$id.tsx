import { createFileRoute } from "@tanstack/react-router";

import { DeliveryForm } from "@/react-app/components/forms/inventory/delivery";
import { Spinner } from "@/react-app/components/ui/spinner";
import { deliveryDetailOptions, deliveryOptions } from "@/react-app/lib/queries/inventory/deliveries";
import { useQuery } from "@tanstack/react-query";

function DeliveryDetail() {
	const { id } = Route.useParams();
	const delivery = useQuery(deliveryDetailOptions(id));
	const deliveries = useQuery(deliveryOptions);

	if (delivery.isLoading || deliveries.isLoading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando entrega...
			</div>
		);
	}

	if (delivery.isError || deliveries.isError) {
		return <p>Não foi possível carregar a entrega.</p>;
	}

	return <DeliveryForm delivery={delivery.data} />;
}

export const Route = createFileRoute("/_authenticated/inventory/delivery/$id")({
	loader: ({ context, params }) => {
		context.queryClient.query({ ...deliveryDetailOptions(params.id) });
		context.queryClient.query({ ...deliveryOptions });
	},
	component: DeliveryDetail,
});
