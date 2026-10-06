import { Link, createFileRoute } from "@tanstack/react-router";

import { BeneficiariesTable } from "@/react-app/components/tables/beneficiaries";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";

function Beneficiaries() {
	const view = Route.useSearch();

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
	<h1 className="text-3xl font-bold">Beneficiaries</h1>
	<Link
		to="/beneficiaries/new"
		className={buttonVariants({ size: "sm" })}
	>
		Novo beneficiary
	</Link>
			</div>
			<BeneficiariesTable view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/beneficiaries/")({
	validateSearch: tableViewSchema,
	component: Beneficiaries,
});
