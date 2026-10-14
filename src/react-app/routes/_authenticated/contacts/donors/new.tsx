import { createFileRoute } from "@tanstack/react-router";

import { DonorForm } from "@/react-app/components/forms/contacts/donor";

function NewDonor() {
	return <DonorForm />;
}

export const Route = createFileRoute("/_authenticated/contacts/donors/new")({
	component: NewDonor,
});
