import { Link, createFileRoute } from "@tanstack/react-router";

import { AssistidosTable } from "@/react-app/components/tables/assistidos";
import { tableViewSchema } from "@/react-app/components/tables/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";

function Assistidos() {
	const view = Route.useSearch();

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Assistidos</h1>
				<Link
					to="/assistidos/novo"
					className={buttonVariants({ size: "sm" })}
				>
					Novo assistido
				</Link>
			</div>
			<AssistidosTable view={view} />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/assistidos/")({
	validateSearch: tableViewSchema,
	component: Assistidos,
});
