import { Link, createFileRoute } from "@tanstack/react-router";

import { BeneficiariesTable } from "@/react-app/components/tables/contacts/beneficiaries";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { beneficiariesOptions } from "@/react-app/lib/queries/contacts/beneficiaries";
import { BeneficiarySelect } from "@/schemas/zod/contacts";

function Beneficiaries() {
	const beneficiaries = useQuery(beneficiariesOptions);

	if (beneficiaries.isLoading) {
		return <div>Loading...</div>;
	}

	if (beneficiaries.isError) {
		return <div>Error: {String(beneficiaries.error)}</div>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Beneficiaries</h1>
				<Link
					to="/contacts/beneficiaries/new"
					className={buttonVariants({ size: "sm" })}
				>
					New beneficiary
				</Link>
			</div>
			<BeneficiariesTable beneficiaries={beneficiaries.data as BeneficiarySelect[]} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/contacts/beneficiaries/")({
	validateSearch: tableViewSchema,
	loader: ({ context }) => {
		context.queryClient.query({ ...beneficiariesOptions });
	},
	component: Beneficiaries,
});
