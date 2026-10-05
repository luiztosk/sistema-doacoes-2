import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AssistidoForm } from "@/react-app/components/forms/assistido";
import { Spinner } from "@/react-app/components/ui/spinner";
import { assistidoDetailOptions } from "@/react-app/lib/api/assistidos";

function EditarAssistido() {
	const { id } = Route.useParams();
	const { data, isPending, isError } = useQuery(assistidoDetailOptions(id));

	if (isPending) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando assistido...
			</div>
		);
	}

	if (isError) {
		return <p>Não foi possível carregar o assistido.</p>;
	}

	return <AssistidoForm assistido={data} />;
}

export const Route = createFileRoute("/_authenticated/assistidos/id/$id")({
	component: EditarAssistido,
});
