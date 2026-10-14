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
	InventoryItemSelect,
	ItemCategorySelect,
} from "@/schemas/zod/inventory";
import { inventoryItemInsertSchema } from "@/schemas/zod/inventory";
import { UNITS } from "@/schemas/db/inventory";
import { queryClient } from "@/react-app/lib/query-client";

const unitLabels: SelectOption[] = UNITS.map((value) => ({
	value,
	label:
		value === "KG" ? "Quilograma" :
		value === "L" ? "Litro" :
		value === "UNIT" ? "Unidade" :
		value === "PACK" ? "Pacote" :
		"Caixa",
}));

export function InventoryItemForm({ item, categories, createMutation, updateMutation }: {
	item?: InventoryItemSelect;
	categories: ItemCategorySelect[];
	createMutation?: ReturnType<typeof import("@/react-app/lib/queries/fetch-client").$api.useMutation>;
	updateMutation?: ReturnType<typeof import("@/react-app/lib/queries/fetch-client").$api.useMutation>;
}) {
	const categoryLabels: SelectOption[] = categories.map((category) => ({
		value: category.id,
		label: category.name
	}))
	const router = useRouter();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!item);

	const form = useForm({
		defaultValues: item,
		onSubmit: async ({ value }) => {
			if (!inventoryItemInsertSchema.safeParse(value).success) {
				return;
			}

			try {
				if (item) {
					await updateMutation?.mutateAsync({ body: value });
				} else {
					await createMutation?.mutateAsync({ body: value });
				}
			} catch {
				return;
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

	const isPending = createMutation?.isPending || updateMutation?.isPending;

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
												item ? "Salvando..." : "Cadastrando..."
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