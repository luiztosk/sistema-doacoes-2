import { Link, createFileRoute } from "@tanstack/react-router";

import { DeliveriesTable } from "@/react-app/components/tables/inventory/deliveries";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { deliveryOptions } from "@/react-app/lib/queries/inventory/deliveries";

function Deliveries() {
	const view = Route.useSearch();
	const deliveries = useQuery(deliveryOptions);

	if (deliveries.isLoading) {
		return <div>Loading...</div>;
	}

	if (deliveries.isError) {
		return <div>Error: {String(deliveries.error)}</div>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Deliveries</h1>
				<Link to="/inventory/delivery/new" className={buttonVariants({ size: "sm" })}>New delivery</Link>
			</div>
			<DeliveriesTable data={deliveries.data ?? []} view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/delivery/")({
	validateSearch: tableViewSchema,
	loader: ({ context }) => {
		context.queryClient.query({ ...deliveryOptions });
	},
	component: Deliveries,
});
