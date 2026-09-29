import { createFileRoute } from "@tanstack/react-router";

import { AssistidosTable } from "@/react-app/components/assistidos-table";

function Assistidos() {
	return (
		<section className="space-y-4">
			<h1 className="text-3xl font-bold">Assistidos</h1>
			<AssistidosTable />
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/assistidos")({
	component: Assistidos,
});
