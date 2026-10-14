import { createFileRoute } from "@tanstack/react-router";

import { DeliveryForm } from "@/react-app/components/forms/inventory/delivery";

function NovaDelivery() {
	return <DeliveryForm />;
}

export const Route = createFileRoute("/_authenticated/inventory/delivery/new")({
	component: NovaDelivery,
});
