import { Link, createFileRoute } from "@tanstack/react-router";

import { DoadoresTable } from "@/react-app/components/tables/doadores";
import { tableViewSchema } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";

function Doadores() {
	const view = Route.useSearch();

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Doadores</h1>
				<Link
					to="/doadores/novo"
					className={buttonVariants({ size: "sm" })}
				>
					Novo doador
				</Link>
			</div>
			<DoadoresTable view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/doadores/")({
	validateSearch: tableViewSchema,
	component: Doadores,
});
