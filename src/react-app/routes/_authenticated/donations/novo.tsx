import { createFileRoute } from "@tanstack/react-router";

import { DonationForm } from "@/react-app/components/forms/donation";

function NovaDonation() {
	return <DonationForm />;
}

export const Route = createFileRoute("/_authenticated/donations/novo")({
	component: NovaDonation,
});
