import { createFileRoute } from "@tanstack/react-router";

import { BeneficiaryForm } from "@/react-app/components/forms/beneficiary";

function NovoBeneficiary() {
	return <BeneficiaryForm />;
}

export const Route = createFileRoute("/_authenticated/beneficiaries/new")({
	component: NovoBeneficiary,
});