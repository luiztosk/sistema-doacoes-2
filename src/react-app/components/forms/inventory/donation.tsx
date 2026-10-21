import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";

import {
	DateField,
	EditableProvider,
	NumberField,
	SelectField,
	SubmitField,
	TextField,
} from "@/react-app/components/forms/fields";
import { donorsOptions } from "@/react-app/lib/queries/contacts/donors";
import { fkOptions } from "@/react-app/lib/fk-factory";
import { itemsOptions } from "@/react-app/lib/queries/inventory/items";
import { useListView, viewForUrl } from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import type { Donation } from "@/schemas/api/donation";
import { donationCreateSchema } from "@/schemas/api/donation";
import { $api } from "@/react-app/lib/queries/fetch-client";
import { queryClient } from "@/react-app/lib/query-client";
import type { DonationFormValues } from "@/react-app/lib/queries/inventory/donations";
import { donationKeys } from "@/react-app/lib/queries/inventory/donations";

function errorFor(values: DonationFormValues, field: string) {
	const parsed = donationCreateSchema.safeParse(values);
	if (parsed.success) return undefined;
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

/**
 * O conteúdo de uma doação é **fixo na criação**. A lista de itens é editável
 * só na criação — depois disso, corrigir é estornar e recriar.
 */
function initialValues(record?: Donation): DonationFormValues {
	return {
		donorId: record?.donorId ?? null,
		occurredAt: record?.occurredAt ?? new Date().toISOString(),
		note: record?.note ?? null,
		items:
			record?.items.map((item) => ({
				itemId: item.itemId,
				quantity: item.quantity,
			})) ?? [],
	};
}

export function DonationForm({ donation }: { donation?: Donation }) {
	const router = useRouter();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!donation);
	const { data: doadores } = useQuery(donorsOptions);
	const { data: itens } = useQuery(itemsOptions);

	const { mutateAsync: createMutateAsync, isPending: createIsPending } = $api.useMutation("post", "/api/v1/donations");
	const { mutateAsync: updateMutateAsync, isPending: updateIsPending } = $api.useMutation("patch", "/api/v1/donations/{id}");
	const { mutateAsync: voidMutateAsync, isPending: voidIsPending } = $api.useMutation("post", "/api/v1/donations/{id}/void");

	const form = useForm({
		defaultValues: initialValues(donation),
		onSubmit: async ({ value }) => {
			const parsed = donationCreateSchema.safeParse(value);
			if (!parsed.success) {
				console.error("validacao falhou", parsed.error.issues);
				return;
			}

			const cabecalho = {
				donorId: parsed.data.donorId,
				occurredAt: parsed.data.occurredAt,
				note: parsed.data.note,
			};

			try {
				if (donation) {
					await updateMutateAsync({
						params: { path: { id: donation.id } },
						body: cabecalho,
					});
				} else {
					await createMutateAsync({ body: parsed.data });
				}
			} catch (error) {
				console.error("Mutation failed:", error);
				return;
			}

			await queryClient.invalidateQueries({ queryKey: donationKeys.all });
			await queryClient.invalidateQueries({ queryKey: ["stock"] });
			await queryClient.invalidateQueries({ queryKey: ["ledger"] });

			await router.navigate({
				to: "/inventory/donations",
				search: lista ? viewForUrl(lista) : {},
			});
		},
	});

	const isPending =
		(createIsPending ?? false) ||
		(updateIsPending ?? false) ||
		(voidIsPending ?? false);

	const itemOptions = fkOptions(itens);

	const estornar = async () => {
		if (!donation) return;
		try {
			await voidMutateAsync({ params: { path: { id: donation.id } } });
		} catch (error) {
			console.error("Mutation failed:", error);
			return;
		}
		await queryClient.invalidateQueries({ queryKey: donationKeys.all });
		await queryClient.invalidateQueries({ queryKey: ["stock"] });
		await queryClient.invalidateQueries({ queryKey: ["ledger"] });
	};

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">
					{donation ? "Detalhes da doação" : "Nova doação"}
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					{donation && !isEditing ? (
						<Button size="sm" onClick={() => setIsEditing(true)}>
							Editar
						</Button>
					) : null}
					{donation && donation.status === "RECEIVED" && !isEditing ? (
						<Button
							size="sm"
							variant="outline"
							onClick={estornar}
							disabled={isPending}
						>
							Estornar doação
						</Button>
					) : null}
					<Link
						to="/inventory/donations"
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
								name="donorId"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "donorId"),
								}}
								children={(field) => (
									<SelectField
										field={field}
										label="Doador"
										options={fkOptions(doadores)}
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
									<DateField field={field} label="Data da doação" />
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
							<FieldLegend variant="label">Itens recebidos</FieldLegend>
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
														<SelectField
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
													onClick={() => field.removeValue(index)}
												>
													Remover
												</Button>
											</div>
										))}
										{!donation ? (
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
						</FieldSet>

						{isEditing ? (
							<div className="flex flex-wrap items-center gap-2">
								<form.Subscribe
									selector={(state) => [state.canSubmit]}
									children={([canSubmit]) => (
										<SubmitField
											label={donation ? "Salvar alterações" : "Cadastrar doação"}
											pendingLabel={donation ? "Salvando..." : "Cadastrando..."}
											canSubmit={canSubmit}
											isPending={isPending}
										/>
									)}
								/>
								{donation ? (
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
