import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { BeneficiaryForm } from "@/react-app/components/forms/contacts/beneficiary";

import { beneficiaryTableOptions } from "@/react-app/lib/queries/contacts/beneficiaries";

function NovoBeneficiary() {
	const categories = useQuery(beneficiaryTableOptions);
	if (categories.isLoading) {
		return <div>Loading...</div>;
	}
	if (categories.isError) {
		return <div>Error: {String(categories.error)}</div>;
	}
	return <BeneficiaryForm />;
}

export const Route = createFileRoute("/_authenticated/contacts/beneficiaries/new")({
	loader: ({ context }) => {
		context.queryClient.query(beneficiaryTableOptions);
	},
	component: NovoBeneficiary,
});