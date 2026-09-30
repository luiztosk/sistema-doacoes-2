import { createFileRoute } from "@tanstack/react-router";

import { AssistidoForm } from "@/react-app/components/forms/assistido";

function NovoAssistido() {
	return <AssistidoForm />;
}

export const Route = createFileRoute("/_authenticated/assistidos/novo")({
	component: NovoAssistido,
});
