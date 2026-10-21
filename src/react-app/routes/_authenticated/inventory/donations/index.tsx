import { Link, createFileRoute } from "@tanstack/react-router";

import { DonationsTable } from "@/react-app/components/tables/inventory/donations";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { donationsOptions } from "@/react-app/lib/queries/inventory/donations";
import { donorsOptions } from "@/react-app/lib/queries/contacts/donors";

function Donations() {
	const view = Route.useSearch();
	const donations = useQuery(donationsOptions);
	const donors = useQuery(donorsOptions);

	if (donations.isLoading || donors.isLoading) {
		return <div>Carregando...</div>;
	}

	if (donations.isError || donors.isError) {
		return <p>Não foi possível carregar as doações.</p>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Doações</h1>
				<Link to="/inventory/donations/new" className={buttonVariants({ size: "sm" })}>Nova doação</Link>
			</div>
			<DonationsTable
				data={donations.data ?? []}
				donors={donors.data ?? []}
				view={view}
			/>
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/inventory/donations/")({
	validateSearch: tableViewSchema,
	loader: ({ context }) => {
		context.queryClient.query({ ...donationsOptions });
		context.queryClient.query({ ...donorsOptions });
	},
	component: Donations,
});
