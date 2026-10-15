import { createFileRoute } from "@tanstack/react-router";

import { DonationForm } from "@/react-app/components/forms/inventory/donation";
import { Spinner } from "@/react-app/components/ui/spinner";
import { donationDetailOptions, donationOptions } from "@/react-app/lib/queries/inventory/donations";
import { useQuery } from "@tanstack/react-query";

function DonationDetail() {
	const { id } = Route.useParams();
	const donation = useQuery(donationDetailOptions(id));
	const donations = useQuery(donationOptions);

	if (donation.isLoading || donations.isLoading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando doação...
			</div>
		);
	}

	if (donation.isError || donations.isError) {
		return <p>Não foi possível carregar a doação.</p>;
	}

	return <DonationForm donation={donation.data} />;
}

export const Route = createFileRoute("/_authenticated/inventory/donations/$id")({
	loader: ({ context, params }) => {
		context.queryClient.query({ ...donationDetailOptions(params.id) });
		context.queryClient.query({ ...donationOptions });
	},
	component: DonationDetail,
});
