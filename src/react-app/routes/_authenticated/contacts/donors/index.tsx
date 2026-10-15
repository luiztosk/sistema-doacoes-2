import { Link, createFileRoute } from "@tanstack/react-router";

import { DonorsTable } from "@/react-app/components/tables/contacts/donors";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { donorOptions } from "@/react-app/lib/queries/contacts/donors";

function Donors() {
	const view = Route.useSearch();
	const donors = useQuery(donorOptions);

	if (donors.isLoading) {
		return <div>Loading...</div>;
	}

	if (donors.isError) {
		return <div>Error: {String(donors.error)}</div>;
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Donors</h1>
				<Link
					to="/contacts/donors/new"
					className={buttonVariants({ size: "sm" })}
				>
					New donor
				</Link>
			</div>
			<DonorsTable data={donors.data ?? []} view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/contacts/donors/")({
	validateSearch: tableViewSchema,
	loader: ({ context }) => {
		context.queryClient.query({ ...donorOptions });
	},
	component: Donors,
});
