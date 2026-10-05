import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { DoadorForm } from "@/react-app/components/forms/doador";
import { Spinner } from "@/react-app/components/ui/spinner";
import { doadorDetailOptions } from "@/react-app/lib/api/doadores";

function DoadorDetail() {
	const { id } = Route.useParams();
	const { data, isPending, isError } = useQuery(doadorDetailOptions(id));

	if (isPending) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando doador...
			</div>
		);
	}

	if (isError) {
		return <p>Não foi possível carregar o doador.</p>;
	}

	return <DoadorForm doador={data} />;
}

export const Route = createFileRoute("/_authenticated/doadores/id/$id")({
	component: DoadorDetail,
});
