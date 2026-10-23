import { Link, createFileRoute } from "@tanstack/react-router";

import { DeliveriesTable } from "@/react-app/components/tables/inventory/deliveries";
import { tableViewSchemaFor } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { deliveriesOptions } from "@/react-app/lib/queries/inventory/deliveries";
import { beneficiariesOptions } from "@/react-app/lib/queries/contacts/beneficiaries";

function Deliveries() {
	const view = Route.useSearch();
	const deliveries = useQuery(deliveriesOptions);
	const beneficiaries = useQuery(beneficiariesOptions);

	if (deliveries.isLoading || beneficiaries.isLoading) {
		return <div>Carregando...</div>;
	}

	if (deliveries.isError || beneficiaries.isError) {
		return <p>Não foi possível carregar as entregas.</p>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Entregas</h1>
				<Link to="/inventory/delivery/new" className={buttonVariants({ size: "sm" })}>Nova entrega</Link>
			</div>
			<DeliveriesTable
				data={deliveries.data ?? []}
				beneficiaries={beneficiaries.data ?? []}
				view={view}
			/>
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/delivery/")({
	validateSearch: tableViewSchemaFor("/inventory/delivery"),
	loader: ({ context }) => {
		context.queryClient.query({ ...deliveriesOptions });
		context.queryClient.query({ ...beneficiariesOptions });
	},
	component: Deliveries,
});
