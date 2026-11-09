import { Link, createFileRoute } from "@tanstack/react-router";

import { BeneficiariesTable } from "@/react-app/components/tables/contacts/beneficiaries";
import { tableViewSchemaFor } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { beneficiariesOptions } from "@/react-app/lib/queries/contacts/beneficiaries";

function Beneficiaries() {
	const view = Route.useSearch();
	const beneficiaries = useQuery(beneficiariesOptions);

	if (beneficiaries.isLoading) {
		return <div>Carregando...</div>;
	}

	if (beneficiaries.isError) {
		return <p>Não foi possível carregar os beneficiários.</p>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Beneficiários</h1>
				<Link
					to="/contacts/beneficiaries/new"
					className={buttonVariants({ size: "sm" })}
				>
					Novo beneficiário
				</Link>
			</div>
			<BeneficiariesTable beneficiaries={beneficiaries.data ?? []} view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/contacts/beneficiaries/")({
	validateSearch: tableViewSchemaFor("/contacts/beneficiaries"),
	loader: ({ context }) => {
		context.queryClient.query({ ...beneficiariesOptions });
	},
	component: Beneficiaries,
});
