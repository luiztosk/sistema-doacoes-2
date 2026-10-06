import { createFileRoute } from "@tanstack/react-router";

import { DonorForm } from "@/react-app/components/forms/donor";

function NewDonor() {
	return <DonorForm />;
}

export const Route = createFileRoute("/_authenticated/donors/new")({
	component: NewDonor,
});
