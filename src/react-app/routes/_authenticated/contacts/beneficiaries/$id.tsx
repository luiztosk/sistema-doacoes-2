import { createFileRoute } from "@tanstack/react-router";

import { BeneficiaryForm } from "@/react-app/components/forms/contacts/beneficiary";
import { Spinner } from "@/react-app/components/ui/spinner";
import { beneficiaryOptions } from "@/react-app/lib/queries/contacts/beneficiaries";
import { useQuery } from "@tanstack/react-query";
import { BeneficiarySelect } from "@/schemas/zod/contacts";

function BeneficiaryDetail() {
	const { id } = Route.useParams();
	const beneficiary = useQuery(beneficiaryOptions(id));

	if (beneficiary.isLoading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner />
				Carregando beneficiário...
			</div>
		);
	}

	if (beneficiary.isError) {
		return <p>Não foi possível carregar o beneficiário.</p>;
	}

	return <BeneficiaryForm 
		beneficiary={beneficiary.data as BeneficiarySelect}
	/>;
}

export const Route = createFileRoute("/_authenticated/contacts/beneficiaries/$id")({
	loader: ({ context, params }) => {
		context.queryClient.query({ ...beneficiaryOptions(params.id) });
	},
	component: BeneficiaryDetail,
});
