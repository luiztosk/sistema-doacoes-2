import { Link, createFileRoute } from "@tanstack/react-router";

import { DoadoresTable } from "@/react-app/components/tables/doadores";
import { tableViewSchema } from "@/react-app/components/tables/table-view-state";
import { Button } from "@/react-app/components/ui/button";

function Doadores() {
	const view = Route.useSearch();

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Doadores</h1>
				<Button size="sm" nativeButton={false} render={<Link to="/doadores/novo" />}>
					Novo doador
				</Button>
			</div>
			<DoadoresTable view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/doadores/")({
	validateSearch: tableViewSchema,
	component: Doadores,
});
