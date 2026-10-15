import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider } from "@/react-app/components/forms/fields";
import { SelectField, SubmitField, TextField } from "@/react-app/components/forms/fields";
import type { SelectOption } from "@/react-app/components/forms/fields";
import { useListView, viewForUrl } from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import type {
	ItemSelect,
	CategorySelect,
} from "@/schemas/zod/inventory";
import { itemInsertSchema, itemUpdateSchema } from "@/schemas/zod/inventory";
import { UNITS } from "@/schemas/db/inventory";
import { queryClient } from "@/react-app/lib/query-client";
import { $api } from "@/react-app/lib/queries/fetch-client";

const unitLabels: SelectOption[] = UNITS.map((value) => ({
	value: value,
	label:
		value === "KG" ? "Quilograma" :
			value === "L" ? "Litro" :
				value === "UNIT" ? "Unidade" :
					value === "PACK" ? "Pacote" :
						"Caixa",
}));

export function InventoryItemForm({ 
	item, 
	categories, 
}: {
	item?: ItemSelect;
	categories: CategorySelect[];
}) {
	const categoryLabels: SelectOption[] = categories.map((category) => ({
		value: category.id,
		label: category.name
	}))
	const router = useRouter();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!item);
	const { mutateAsync: createMutateAsync, isPending: createIsPending } = $api.useMutation("post", "/api/v1/inventory/items");
	const { mutateAsync: updateMutateAsync, isPending: updateIsPending } = $api.useMutation("patch", "/api/v1/inventory/items/{id}");

	const form = useForm({
		defaultValues: item,
		onSubmit: async ({ value }) => {
			if (updateMutateAsync && item) {
				const validation = itemUpdateSchema.safeParse(value);
				if (!validation.success) {
					console.error('update validation failed:', validation.error.message);
					return;
				}
				try {
					await updateMutateAsync({
						params: { path: { id: item.id } },
						body: validation.data,
					});
					console.log('sucess mutated')
				} catch (error) {
					console.error('Mutation failed:', error)
					return;
				}
			} else if (createMutateAsync) {
				const validation = itemInsertSchema.safeParse(value);
				if (!validation.success) {
					console.error('insert validation failed:', validation.error.message);
					return;
				}
				try {
					await createMutateAsync({ body: validation.data });
					console.log('sucess mutated')
				} catch (error) {
					console.error('Mutation failed:', error)
					return;
				}
			}

			await queryClient.invalidateQueries({
				queryKey: ["inventory-items"],
			});

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
								children={(field) => (
									<TextField field={field} label="Nome" />
								)}
							/>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Classificação</FieldLegend>
							<form.Field
								name="categoryId"
								children={(field) => (
									<SelectField
										field={field}
										label="Categoria"
										options={categoryLabels}
									/>
								)}
							/>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Unidade</FieldLegend>
							<form.Field
								name="unit"
								children={(field) => (
									<SelectField
										field={field}
										label="Unidade de medida"
										options={unitLabels}
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