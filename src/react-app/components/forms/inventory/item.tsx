import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider } from "@/react-app/components/forms/fields";
import { SearchableSelectField, SelectField, SubmitField, TextField } from "@/react-app/components/forms/fields";
import type { SelectOption } from "@/react-app/components/forms/fields";
import { useListView, viewForUrl } from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import type { InventoryItem } from "@/schemas/api/item";
import { itemCreateSchema } from "@/schemas/api/item";
import type { ItemCategory } from "@/schemas/api/category";
import { UNITS } from "@/schemas/api/enums";
import { queryClient } from "@/react-app/lib/query-client";
import { $api } from "@/react-app/lib/queries/fetch-client";
import type { ItemFormValues } from "@/react-app/lib/queries/inventory/items";
import { itemKeys } from "@/react-app/lib/queries/inventory/items";

const unitLabels: SelectOption[] = UNITS.map((value) => ({
	value: value,
	label:
		value === "KG" ? "Quilograma" :
			value === "L" ? "Litro" :
				value === "UNIT" ? "Unidade" :
					value === "PACK" ? "Pacote" :
						"Caixa",
}));

function errorFor(values: ItemFormValues, field: string) {
	const parsed = itemCreateSchema.safeParse(values);
	if (parsed.success) return undefined;
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

/**
 * O saldo **não** vem do formulário. Ele só se move pelas operações de
 * estoque, e o `POST` do item nasce com o saldo zerado — por isso o `id` do
 * item, o `onHand`, o `reserved` e o `available` não são campos do formulário.
 */
function initialValues(record?: InventoryItem): ItemFormValues {
	return {
		name: record?.name ?? "",
		categoryId: record?.categoryId ?? null,
		unit: record?.unit ?? null,
	};
}

export function InventoryItemForm({
	item,
	categories,
}: {
	item?: InventoryItem;
	categories: ItemCategory[];
}) {
	const categoryLabels: SelectOption[] = categories.map((category) => ({
		value: category.id,
		label: category.name,
	}));
	const router = useRouter();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!item);
	const { mutateAsync: createMutateAsync, isPending: createIsPending } = $api.useMutation("post", "/api/v1/inventory/items");
	const { mutateAsync: updateMutateAsync, isPending: updateIsPending } = $api.useMutation("patch", "/api/v1/inventory/items/{id}");

	const form = useForm({
		defaultValues: initialValues(item),
		onSubmit: async ({ value }) => {
			const parsed = itemCreateSchema.safeParse(value);
			if (!parsed.success) {
				console.error("validacao falhou", parsed.error.issues);
				return;
			}

			try {
				if (item) {
					await updateMutateAsync({
						params: { path: { id: item.id } },
						body: parsed.data,
					});
				} else {
					await createMutateAsync({ body: parsed.data });
				}
			} catch (error) {
				console.error("Mutation failed:", error);
				return;
			}

			await queryClient.invalidateQueries({ queryKey: itemKeys.all });
			await queryClient.invalidateQueries({ queryKey: ["stock"] });

			await router.navigate({
				to: "/inventory/item",
				search: lista ? viewForUrl(lista) : {},
			});
		},
	});
	const isPending = (createIsPending ?? false) || (updateIsPending ?? false);

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">
					{item ? "Detalhes do item" : "Novo item de estoque"}
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					{item ? (
						<Button size="sm" onClick={() => setIsEditing(true)}>
							Editar
						</Button>
					) : null}
					<Link
						to="/inventory/item"
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
								name="name"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "name"),
								}}
								children={(field) => (
									<TextField field={field} label="Nome" />
								)}
							/>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Classificação</FieldLegend>
							<form.Field
								name="categoryId"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "categoryId"),
								}}
								children={(field) => (
									<SearchableSelectField
										field={field}
										label="Categoria"
										options={categoryLabels}
										placeholder="Selecione"
									/>
								)}
							/>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Unidade</FieldLegend>
							<form.Field
								name="unit"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "unit"),
								}}
								children={(field) => (
									<SelectField
										field={field}
										label="Unidade de medida"
										options={unitLabels}
										placeholder="Selecione"
									/>
								)}
							/>
						</FieldSet>

						{isEditing ? (
							<div className="flex flex-wrap items-center gap-2">
								<form.Subscribe
									selector={(state) => [state.canSubmit]}
									children={([canSubmit]) => (
										<SubmitField
											label={
												item
													? "Salvar alterações"
													: "Cadastrar item"
											}
											pendingLabel={
												item
													? "Salvando..."
													: "Cadastrando..."
											}
											canSubmit={canSubmit}
											isPending={isPending}
										/>
									)}
								/>
								{item ? (
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
