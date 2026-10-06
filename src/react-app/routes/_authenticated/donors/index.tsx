import { Link, createFileRoute } from "@tanstack/react-router";

import { DonorsTable } from "@/react-app/components/tables/donors";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";

function Donors() {
	const view = Route.useSearch();

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
		<h1 className="text-3xl font-bold">Donors</h1>
		<Link
			to="/donors/new"
			className={buttonVariants({ size: "sm" })}
		>
			Novo donor
		</Link>
			</div>
			<DonorsTable view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/donors/")({
	validateSearch: tableViewSchema,
	component: Donors,
});
