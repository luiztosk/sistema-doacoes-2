import { createFileRoute } from "@tanstack/react-router";

import { DeliveryForm } from "@/react-app/components/forms/delivery";

function NovaDelivery() {
	return <DeliveryForm />;
}

export const Route = createFileRoute("/_authenticated/inventory/deliveries/new")({
	component: NovaDelivery,
});
