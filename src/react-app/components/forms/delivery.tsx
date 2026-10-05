import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider } from "@/react-app/components/forms/fields";
import { SubmitField, TextField } from "@/react-app/components/forms/fields";
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
		occurredAt: record?.occurredAt ? new Date(record.occurredAt * 1000) : null,
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
							<form.Field name="beneficiaryId" validators={{ onBlur: ({ fieldApi }) => errorFor(fieldApi.form.state.values, "beneficiaryId") }} children={(field) => <TextField field={field} label="Beneficiario" />} />
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
