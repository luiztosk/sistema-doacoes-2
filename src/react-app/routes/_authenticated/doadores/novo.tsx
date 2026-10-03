import { createFileRoute } from "@tanstack/react-router";

import { DoadorForm } from "@/react-app/components/forms/doador";

function NovoDoador() {
	return <DoadorForm />;
}

export const Route = createFileRoute("/_authenticated/doadores/novo")({
	component: NovoDoador,
});
