import { createFileRoute } from "@tanstack/react-router";

import { BeneficiaryForm } from "@/react-app/components/forms/contacts/beneficiary";

function NovoBeneficiary() {
	return <BeneficiaryForm />;
}

export const Route = createFileRoute("/_authenticated/contacts/beneficiaries/new")({
	component: NovoBeneficiary,
});