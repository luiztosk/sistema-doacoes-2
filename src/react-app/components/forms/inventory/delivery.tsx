import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider, DateField, SelectField, SubmitField } from "@/react-app/components/forms/fields";
import { beneficiariesOptions } from "@/react-app/lib/queries/contacts/beneficiaries";
import { fkOptions } from "@/react-app/lib/fk-factory";
import { useListView, viewForUrl } from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import { $api } from "@/react-app/lib/queries/fetch-client";
import { queryClient } from "@/react-app/lib/query-client";
import { deliveryWithLinesInsertSchema, deliveryWithLinesUpdateSchema, DeliveryWithLinesSelect } from "@/schemas/zod/inventory";

export function DeliveryForm({ delivery }: DeliveryWithLinesSelect) {
	const router = useRouter();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!delivery);
	const { data: beneficiariesData } = useQuery(beneficiariesOptions);

	const { mutateAsync: createMutateAsync, isPending: createIsPending } = $api.useMutation("post", "/api/v1/deliveries");
	const { mutateAsync: updateMutateAsync, isPending: updateIsPending } = $api.useMutation("patch", "/api/v1/deliveries/{id}");

	const form = useForm({
		defaultValues: delivery,
		onSubmit: async ({ value }) => {
			if (updateMutateAsync && delivery) {
				const validation = deliveryWithLinesUpdateSchema.safeParse(value);
				if (!validation.success) {
					console.error('update validation failed:', validation.error?.message);
					return;
				}
				try {
					await updateMutateAsync({ params: { path: { id: delivery.id } }, body: validation.data });
				} catch (error) {
					console.error('Mutation failed:', error);
					return;
				}
			} else if (createMutateAsync) {
				const validation = deliveryWithLinesInsertSchema.safeParse(value);
				if (!validation.success) {
					console.error('insert validation failed:', validation.error?.message);
					return;
				}
				try {
					await createMutateAsync({ body: validation.data });
				} catch (error) {
					console.error('Mutation failed:', error);
					return;
				}
			}
			await queryClient.invalidateQueries({ queryKey: ["deliveries"] });
			await router.navigate({ to: "/inventory/delivery", search: lista ? viewForUrl(lista) : {} });
		},
	});

	const isPending = (createIsPending ?? false) || (updateIsPending ?? false);

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">{delivery ? "Detalhes da entrega" : "Nova entrega"}</h1>
				<div className="flex gap-2">
					{delivery && !isEditing ? <Button size="sm" onClick={() => setIsEditing(true)}>Editar</Button> : null}
					<Link to="/inventory/delivery" search={lista ? viewForUrl(lista) : {}} className={buttonVariants({ variant: "outline", size: "sm" })}>Back</Link>
				</div>
			</div>
			<form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}>
				<EditableProvider editable={isEditing}>
					<FieldGroup>
						<FieldSet>
							<FieldLegend variant="label">Identificacao</FieldLegend>
							<form.Field name="beneficiaryId"
								// validators={{ onBlur: ({ fieldApi }) => errorFor(fieldApi.form.state.values, "beneficiaryId") }} 
								children={(field) => (
									<SelectField field={field} label="Beneficiario" options={fkOptions("beneficiaries", beneficiariesData ?? [])} placeholder="Selecione" />
								)} />
							<form.Field name="occurredAt"
								// validators={{ onBlur: ({ fieldApi }) => errorFor(fieldApi.form.state.values, "occurredAt") }}
								children={(field) => <DateField field={field} label="Data da entrega" />} />
						</FieldSet>
						{isEditing ? (
							<div className="flex gap-2">
								<form.Subscribe selector={(s) => [s.canSubmit]} children={([canSubmit]) => (
									<SubmitField label={delivery ? "Salvar" : "Cadastrar"} pendingLabel={delivery ? "Salvando..." : "Cadastrando..."} canSubmit={canSubmit} isPending={isPending} />
								)} />
							</div>
						) : null}
					</FieldGroup>
				</EditableProvider>
			</form>
		</section>
	);
}
