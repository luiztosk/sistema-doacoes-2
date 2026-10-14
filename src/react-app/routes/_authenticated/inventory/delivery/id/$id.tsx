import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { DeliveryForm } from "@/react-app/components/forms/inventory/delivery";
import { Spinner } from "@/react-app/components/ui/spinner";
import { deliveryDetailOptions } from "@/react-app/lib/queries/inventory/deliveries";

function EditarDelivery() {
	const { id } = Route.useParams();
	const { data, isPending, isError } = useQuery(deliveryDetailOptions(id));

	if (isPending) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando entrega...
			</div>
		);
	}

	if (isError) {
		return <p>Nao foi possivel carregar a entrega.</p>;
	}

	return <DeliveryForm delivery={data} />;
}

export const Route = createFileRoute("/_authenticated/inventory/delivery/id/$id")({
	component: EditarDelivery,
});
