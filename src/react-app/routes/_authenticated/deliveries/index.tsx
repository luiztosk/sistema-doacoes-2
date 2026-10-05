import { Link, createFileRoute } from "@tanstack/react-router";

import { DeliveriesTable } from "@/react-app/components/tables/deliveries";
import { tableViewSchema } from "@/react-app/components/tables/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";

function Deliveries() {
	const view = Route.useSearch();
	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Entregas</h1>
				<Link to="/deliveries/novo" className={buttonVariants({ size: "sm" })}>Nova entrega</Link>
			</div>
			<DeliveriesTable view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/deliveries/")({
	validateSearch: tableViewSchema,
	component: Deliveries,
});
