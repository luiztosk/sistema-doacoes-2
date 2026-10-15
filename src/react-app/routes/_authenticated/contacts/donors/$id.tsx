import { createFileRoute } from "@tanstack/react-router";

import { DonorForm } from "@/react-app/components/forms/contacts/donor";
import { Spinner } from "@/react-app/components/ui/spinner";
import { donorDetailOptions, donorOptions } from "@/react-app/lib/queries/contacts/donors";
import { useQuery } from "@tanstack/react-query";

function DonorDetail() {
	const { id } = Route.useParams();
	const donor = useQuery(donorDetailOptions(id));
	const donors = useQuery(donorOptions);

	if (donor.isLoading || donors.isLoading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando donor...
			</div>
		);
	}

	if (donor.isError || donors.isError) {
		return <p>Não foi possível carregar o donor.</p>;
	}

	return <DonorForm donor={donor.data} />;
}

export const Route = createFileRoute("/_authenticated/contacts/donors/$id")({
	loader: ({ context, params }) => {
		context.queryClient.query({ ...donorDetailOptions(params.id) });
		context.queryClient.query({ ...donorOptions });
	},
	component: DonorDetail,
});
