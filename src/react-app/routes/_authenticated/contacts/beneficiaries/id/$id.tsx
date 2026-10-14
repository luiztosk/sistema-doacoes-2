import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { BeneficiaryForm } from "@/react-app/components/forms/contacts/beneficiary";
import { Spinner } from "@/react-app/components/ui/spinner";
import { beneficiaryOptions } from "@/react-app/lib/queries/contacts/beneficiaries";

function EditarBeneficiary() {
	const { id } = Route.useParams();
	const { data, isPending, isError } = useQuery(beneficiaryOptions(id));

	if (isPending) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando beneficiary...
			</div>
		);
	}

	if (isError) {
		return <p>Não foi possível carregar o beneficiary.</p>;
	}

	return <BeneficiaryForm beneficiary={data} />;
}

export const Route = createFileRoute("/_authenticated/contacts/beneficiaries/id/$id")({
	component: EditarBeneficiary,
});
