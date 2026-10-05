import { Link, createFileRoute } from "@tanstack/react-router";

import { DonationsTable } from "@/react-app/components/tables/donations";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";

function Donations() {
	const view = Route.useSearch();
	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Doacoes</h1>
				<Link to="/donations/novo" className={buttonVariants({ size: "sm" })}>Nova doacao</Link>
			</div>
			<DonationsTable view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/donations/")({
	validateSearch: tableViewSchema,
	component: Donations,
});
