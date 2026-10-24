import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";

import {
	DateField,
	EditableProvider,
	NumberField,
	SearchableSelectField,
	SubmitField,
	TextField,
} from "@/react-app/components/forms/fields";
import { beneficiariesOptions } from "@/react-app/lib/queries/contacts/beneficiaries";
import { fkOptions } from "@/react-app/lib/fk-factory";
import { itemsOptions } from "@/react-app/lib/queries/inventory/items";
import { useListView, viewForUrl } from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import { $api } from "@/react-app/lib/queries/fetch-client";
import { queryClient } from "@/react-app/lib/query-client";
import type { Delivery } from "@/schemas/api/delivery";
import { deliveryCreateSchema } from "@/schemas/api/delivery";
import type { DeliveryFormValues } from "@/react-app/lib/queries/inventory/deliveries";
import { deliveryKeys } from "@/react-app/lib/queries/inventory/deliveries";

function errorFor(values: DeliveryFormValues, field: string) {
	const parsed = deliveryCreateSchema.safeParse(values);
	if (parsed.success) return undefined;
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

function initialValues(record?: Delivery): DeliveryFormValues {
	return {
		beneficiaryId: record?.beneficiaryId ?? null,
		occurredAt: record?.occurredAt ?? new Date().toISOString(),
		note: record?.note ?? null,
		items:
			record?.items.map((item) => ({
				itemId: item.itemId,
				quantity: item.quantity,
			})) ?? [],
	};
}

export function DeliveryForm({ delivery }: { delivery?: Delivery }) {
	const router = useRouter();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!delivery);
	const { data: beneficiaries } = useQuery(beneficiariesOptions);
	const { data: itens } = useQuery(itemsOptions);

	const { mutateAsync: createMutateAsync, isPending: createIsPending } = $api.useMutation("post", "/api/v1/deliveries");
	const { mutateAsync: updateMutateAsync, isPending: updateIsPending } = $api.useMutation("patch", "/api/v1/deliveries/{id}");
	const { mutateAsync: completeMutateAsync, isPending: completeIsPending } = $api.useMutation("post", "/api/v1/deliveries/{id}/complete");
	const { mutateAsync: cancelMutateAsync, isPending: cancelIsPending } = $api.useMutation("post", "/api/v1/deliveries/{id}/cancel");

	const form = useForm({
		defaultValues: initialValues(delivery),
		onSubmit: async ({ value }) => {
			const parsed = deliveryCreateSchema.safeParse(value);
			if (!parsed.success) {
				console.error("validacao falhou", parsed.error.issues);
				return;
			}

			const cabecalho = {
				beneficiaryId: parsed.data.beneficiaryId,
				occurredAt: parsed.data.occurredAt,
				note: parsed.data.note,
			};

			try {
				if (delivery) {
					await updateMutateAsync({
						params: { path: { id: delivery.id } },
						body: cabecalho,
					});
				} else {
					await createMutateAsync({ body: parsed.data });
				}
			} catch (error) {
				console.error("Mutation failed:", error);
				return;
			}

			await queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
			await queryClient.invalidateQueries({ queryKey: ["stock"] });
			await queryClient.invalidateQueries({ queryKey: ["ledger"] });

			await router.navigate({
				to: "/inventory/delivery",
				search: lista ? viewForUrl(lista) : {},
			});
		},
	});

	const isPending =
		(createIsPending ?? false) ||
		(updateIsPending ?? false) ||
		(completeIsPending ?? false) ||
		(cancelIsPending ?? false);

	const itemOptions = fkOptions(itens);

	const completar = async () => {
		if (!delivery) return;
		try {
			await completeMutateAsync({ params: { path: { id: delivery.id } } });
		} catch (error) {
			console.error("Mutation failed:", error);
			return;
		}
		await queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
		await queryClient.invalidateQueries({ queryKey: ["stock"] });
		await queryClient.invalidateQueries({ queryKey: ["ledger"] });
	};

	const cancelar = async () => {
		if (!delivery) return;
		try {
			await cancelMutateAsync({ params: { path: { id: delivery.id } } });
		} catch (error) {
			console.error("Mutation failed:", error);
			return;
		}
		await queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
		await queryClient.invalidateQueries({ queryKey: ["stock"] });
		await queryClient.invalidateQueries({ queryKey: ["ledger"] });
	};

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">
					{delivery ? "Detalhes da entrega" : "Nova entrega"}
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					{delivery && !isEditing ? (
						<Button size="sm" onClick={() => setIsEditing(true)}>
							Editar
						</Button>
					) : null}
					{delivery && delivery.status === "OPEN" && !isEditing ? (
						<>
							<Button size="sm" onClick={completar} disabled={isPending}>
								Concluir entrega
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={cancelar}
								disabled={isPending}
							>
								Cancelar entrega
							</Button>
						</>
					) : null}
					<Link
						to="/inventory/delivery"
						search={lista ? viewForUrl(lista) : {}}
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						Voltar para a lista
					</Link>
				</div>
			</div>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<EditableProvider editable={isEditing}>
					<FieldGroup>
						<FieldSet>
							<FieldLegend variant="label">Identificação</FieldLegend>
							<form.Field
								name="beneficiaryId"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "beneficiaryId"),
								}}
								children={(field) => (
									<SearchableSelectField
										field={field}
										label="Beneficiário"
										options={fkOptions(beneficiaries)}
										placeholder="Selecione"
									/>
								)}
							/>
							<form.Field
								name="occurredAt"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "occurredAt"),
								}}
								children={(field) => (
									<DateField field={field} label="Data da entrega" />
								)}
							/>
							<form.Field
								name="note"
								children={(field) => (
									<TextField field={field} label="Observação" />
								)}
							/>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Itens entregues</FieldLegend>
							<EditableProvider editable={isEditing && !delivery}>
								<form.Field
									name="items"
									mode="array"
									children={(field) => (
										<div className="space-y-4">
											{field.state.value.map((_, index) => (
												<div
													key={index}
													className="grid items-end gap-2 sm:grid-cols-[1fr_10rem_auto]"
												>
													<form.Field
														name={`items[${index}].itemId`}
														mode="value"
														children={(itemField) => (
															<SearchableSelectField
																field={itemField}
																label="Item"
																options={itemOptions}
																placeholder="Selecione"
															/>
														)}
													/>
													<form.Field
														name={`items[${index}].quantity`}
														mode="value"
														children={(quantityField) => (
															<NumberField
																field={quantityField}
																label="Quantidade"
																min={1}
															/>
														)}
													/>
													<Button
														type="button"
														variant="outline"
														disabled={Boolean(delivery) || !isEditing}
														onClick={() => field.removeValue(index)}
													>
														Remover
													</Button>
												</div>
											))}
											{!delivery ? (
												<Button
													type="button"
													variant="outline"
													onClick={() =>
														field.pushValue({ itemId: null, quantity: 1 })
													}
												>
													Adicionar item
												</Button>
											) : null}
										</div>
									)}
								/>
							</EditableProvider>
						</FieldSet>

						{isEditing ? (
							<div className="flex flex-wrap items-center gap-2">
								<form.Subscribe
									selector={(state) => [state.canSubmit]}
									children={([canSubmit]) => (
										<SubmitField
											label={
												delivery ? "Salvar alterações" : "Cadastrar entrega"
											}
											pendingLabel={delivery ? "Salvando..." : "Cadastrando..."}
											canSubmit={canSubmit}
											isPending={isPending}
										/>
									)}
								/>
								{delivery ? (
									<Button
										type="button"
										variant="outline"
										disabled={isPending}
										onClick={() => {
											form.reset();
											setIsEditing(false);
										}}
									>
										Cancelar
									</Button>
								) : null}
							</div>
						) : null}
					</FieldGroup>
				</EditableProvider>
			</form>
		</section>
	);
}
