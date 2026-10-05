import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { DonationForm } from "@/react-app/components/forms/donation";
import { Spinner } from "@/react-app/components/ui/spinner";
import { donationDetailOptions } from "@/react-app/lib/api/donations";

function EditarDonation() {
	const { id } = Route.useParams();
	const { data, isPending, isError } = useQuery(donationDetailOptions(id));

	if (isPending) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando doacao...
			</div>
		);
	}

	if (isError) {
		return <p>Nao foi possivel carregar a doacao.</p>;
	}

	return <DonationForm donation={data} />;
}

export const Route = createFileRoute("/_authenticated/donations/id/$id")({
	component: EditarDonation,
});
