import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider, DateField, SelectField, SubmitField } from "@/react-app/components/forms/fields";
import { assistidoOptions } from "@/react-app/lib/api/assistidos";
import { fkOptions } from "@/react-app/lib/api/fk-factory";
import { useListView, viewForUrl } from "@/react-app/components/tables/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import type { DeliveryCompleto, DeliveryFormValues } from "@/react-app/lib/api/deliveries";
import {
	deliveryKeys,
	createDeliveryOptions,
	updateDeliveryOptions,
} from "@/react-app/lib/api/deliveries";
import { deliveryInsertSchema } from "@/worker/db/schema";

type DeliveryFormProps = { delivery?: DeliveryCompleto };

function initialValues(record?: DeliveryCompleto): DeliveryFormValues {
	return {
		beneficiaryId: record?.beneficiaryId ?? null,
		occurredAt: record?.occurredAt != null ? new Date(Number(record.occurredAt) * 1000) : null,
		note: record?.note ?? null,
	};
}

function errorFor(values: DeliveryFormValues, field: string) {
	const parsed = deliveryInsertSchema.safeParse(values);
	if (parsed.success) return undefined;
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

export function DeliveryForm({ delivery }: DeliveryFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!delivery);
	const { data: assistidosData } = useQuery(assistidoOptions);

	const create = useMutation({ ...createDeliveryOptions, mutationKey: [...deliveryKeys.all, "create"] });
	const update = useMutation({ ...updateDeliveryOptions(delivery?.id ?? ""), mutationKey: [...deliveryKeys.all, "update"] });

	const form = useForm({
		defaultValues: initialValues(delivery),
		onSubmit: async ({ value }) => {
			if (!deliveryInsertSchema.safeParse(value).success) return;
			try {
				if (delivery) await update.mutateAsync(value);
				else await create.mutateAsync(value);
			} catch { return; }
			await queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
			await router.navigate({ to: "/deliveries", search: lista ? viewForUrl(lista) : {} });
		},
	});

	const isPending = create.isPending || update.isPending;

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">{delivery ? "Detalhes da entrega" : "Nova entrega"}</h1>
				<div className="flex gap-2">
					{delivery && !isEditing ? <Button size="sm" onClick={() => setIsEditing(true)}>Editar</Button> : null}
					<Link to="/deliveries" search={lista ? viewForUrl(lista) : {}} className={buttonVariants({ variant: "outline", size: "sm" })}>Voltar</Link>
				</div>
			</div>
			<form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}>
				<EditableProvider editable={isEditing}>
					<FieldGroup>
						<FieldSet>
							<FieldLegend variant="label">Identificacao</FieldLegend>
							<form.Field name="beneficiaryId" validators={{ onBlur: ({ fieldApi }) => errorFor(fieldApi.form.state.values, "beneficiaryId") }} children={(field) => (
							<SelectField field={field} label="Beneficiario" options={fkOptions("assistidos", assistidosData ?? [])} placeholder="Selecione" />
						)} />
						<form.Field name="occurredAt" validators={{ onBlur: ({ fieldApi }) => errorFor(fieldApi.form.state.values, "occurredAt") }} children={(field) => <DateField field={field} label="Data da entrega" />} />
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
