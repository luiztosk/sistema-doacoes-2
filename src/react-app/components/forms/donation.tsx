import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider, DateField, SelectField, SubmitField, TextField } from "@/react-app/components/forms/fields";
import { doadorOptions } from "@/react-app/lib/api/doadores";
import { fkOptions } from "@/react-app/lib/api/fk-factory";
import { useListView, viewForUrl } from "@/react-app/components/tables/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import type { DonationCompleto, DonationFormValues } from "@/react-app/lib/api/donations";
import {
	donationKeys,
	createDonationOptions,
	updateDonationOptions,
} from "@/react-app/lib/api/donations";
import { donationInsertSchema } from "@/worker/db/schema";

function errorFor(values: DonationFormValues, field: string) {
	const parsed = donationInsertSchema.safeParse(values);
	if (parsed.success) return undefined;
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

type DonationFormProps = { donation?: DonationCompleto };

function initialValues(record?: DonationCompleto): DonationFormValues {
	return {
		donorId: record?.donorId ?? null,
		occurredAt: record?.occurredAt ? new Date(record.occurredAt * 1000) : null,
		note: record?.note ?? null,
	};
}

export function DonationForm({ donation }: DonationFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!donation);
	const { data: doadoresData } = useQuery(doadorOptions);

	const create = useMutation({ ...createDonationOptions, mutationKey: [...donationKeys.all, "create"] });
	const update = useMutation({ ...updateDonationOptions(donation?.id ?? ""), mutationKey: [...donationKeys.all, "update"] });


	const form = useForm({
		defaultValues: initialValues(donation),
		onSubmit: async ({ value }) => {
			if (!donationInsertSchema.safeParse(value).success) return;
			try {
				if (donation) await update.mutateAsync(value);
				else await create.mutateAsync(value);
			} catch { return; }
			await queryClient.invalidateQueries({ queryKey: donationKeys.all });
			await router.navigate({ to: "/donations", search: lista ? viewForUrl(lista) : {} });
		},
	});

	const isPending = create.isPending || update.isPending;

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">{donation ? "Detalhes da doacao" : "Nova doacao"}</h1>
				<div className="flex gap-2">
					{donation && !isEditing ? <Button size="sm" onClick={() => setIsEditing(true)}>Editar</Button> : null}
					<Link to="/donations" search={lista ? viewForUrl(lista) : {}} className={buttonVariants({ variant: "outline", size: "sm" })}>Voltar</Link>
				</div>
			</div>
			<form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}>
				<EditableProvider editable={isEditing}>
					<FieldGroup>
						<FieldSet>
							<FieldLegend variant="label">Identificacao</FieldLegend>
							<form.Field name="donorId" validators={{ onBlur: ({ fieldApi }) => errorFor(fieldApi.form.state.values, "donorId") }} children={(field) => (
							<SelectField field={field} label="Doador" options={fkOptions("doadores", doadoresData ?? [])} placeholder="Selecione" />
						)} />
						<form.Field name="occurredAt" validators={{ onBlur: ({ fieldApi }) => errorFor(fieldApi.form.state.values, "occurredAt") }} children={(field) => <DateField field={field} label="Data da doacao" />} />
						<form.Field name="note" children={(field) => <TextField field={field} label="Observacao" />} />
						</FieldSet>
						{isEditing ? (
							<div className="flex gap-2">
								<form.Subscribe selector={(s) => [s.canSubmit]} children={([canSubmit]) => (
									<SubmitField label={donation ? "Salvar" : "Cadastrar"} pendingLabel={donation ? "Salvando..." : "Cadastrando..."} canSubmit={canSubmit} isPending={isPending} />
								)} />
							</div>
						) : null}
					</FieldGroup>
				</EditableProvider>
			</form>
		</section>
	);
}
