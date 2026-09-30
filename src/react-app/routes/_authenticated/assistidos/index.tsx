import { Link, createFileRoute } from "@tanstack/react-router";

import { AssistidosTable } from "@/react-app/components/tables/assistidos";
import { Button } from "@/react-app/components/ui/button";

function Assistidos() {
	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Assistidos</h1>
				<Button size="sm" nativeButton={false} render={<Link to="/assistidos/novo" />}>
					
					Novo assistido
				</Button>
			</div>
			<AssistidosTable />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/assistidos/")({
	component: Assistidos,
});
