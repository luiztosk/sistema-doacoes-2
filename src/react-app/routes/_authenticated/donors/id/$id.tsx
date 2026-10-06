import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { DonorForm } from "@/react-app/components/forms/donor";
import { Spinner } from "@/react-app/components/ui/spinner";
import { donorDetailOptions } from "@/react-app/lib/api/donors";

function DonorDetail() {
	const { id } = Route.useParams();
	const { data, isPending, isError } = useQuery(donorDetailOptions(id));

	if (isPending) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando donor...
			</div>
		);
	}

	if (isError) {
		return <p>Não foi possível carregar o donor.</p>;
	}

	return <DonorForm donor={data} />;
}

export const Route = createFileRoute("/_authenticated/donors/id/$id")({
	component: DonorDetail,
});
