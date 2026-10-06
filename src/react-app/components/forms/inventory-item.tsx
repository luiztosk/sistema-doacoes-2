import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider } from "@/react-app/components/forms/fields";
import { SelectField, SubmitField, TextField } from "@/react-app/components/forms/fields";
import type { SelectOption } from "@/react-app/components/forms/fields";
import { useListView, viewForUrl } from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import type {
	InventoryItemSelect,
	InventoryItemInsert,
} from "@/schemas/zod/inventory";
import { inventoryItemInsertSchema } from "@/schemas/zod/inventory";
import { UNITS } from "@/schemas/db/inventory";
import {
	inventoryItemKeys,
	createInventoryItemOptions,
	updateInventoryItemOptions,
} from "@/react-app/lib/api/inventory-items";

type InventoryItemFormProps = {
	inventoryItem?: InventoryItemSelect;
};

const unitOptions: SelectOption[] = UNITS.map((value) => ({
	value,
	label:
		value === "KG" ? "Quilograma" :
		value === "L" ? "Litro" :
		value === "UNIT" ? "Unidade" :
		value === "PACK" ? "Pacote" :
		"Caixa",
}));

function initialValues(record?: InventoryItemSelect): InventoryItemInsert {
	return {
		name: record?.name ?? "",
		categoryId: record?.categoryId ?? "",
		unit: record?.unit ?? "UNIT",
	};
}

// function errorFor(values: InventoryItemInsert, field: string) {
// 	const parsed = inventoryItemInsertSchema.safeParse(values);
// 	if (parsed.success) {
// 		return undefined;
// 	}
// 	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
// }

export function InventoryItemForm({ inventoryItem }: InventoryItemFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!inventoryItem);

	const create = useMutation(createInventoryItemOptions);
	const update = useMutation(
		updateInventoryItemOptions(inventoryItem?.id ?? ""),
	);

	const form = useForm({
		defaultValues: initialValues(inventoryItem),
		onSubmit: async ({ value }) => {
			if (!inventoryItemInsertSchema.safeParse(value).success) {
				return;
			}

			try {
				if (inventoryItem) {
					await update.mutateAsync(value);
				} else {
					await create.mutateAsync(value);
				}
			} catch {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: inventoryItemKeys.all,
			});

			await router.navigate({
				to: "/inventory-items",
				search: lista ? viewForUrl(lista) : {},
			});
		},
	});

	const isPending = create.isPending || update.isPending;

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">
					{inventoryItem ? "Detalhes do item" : "Novo item de estoque"}
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					{inventoryItem && !isEditing ? (
						<Button size="sm" onClick={() => setIsEditing(true)}>
							Editar
						</Button>
					) : null}
					<Link
						to="/inventory-items"
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
								// validators={{
								// 	onBlur: ({ fieldApi }) =>
								// 		errorFor(fieldApi.form.state.values, "name"),
								// }}
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
									<TextField field={field} label="Categoria" />
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
										options={unitOptions}
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
												inventoryItem
													? "Salvar alterações"
													: "Cadastrar item"
											}
											pendingLabel={
												inventoryItem ? "Salvando..." : "Cadastrando..."
											}
											canSubmit={canSubmit}
											isPending={isPending}
										/>
									)}
								/>
								{inventoryItem ? (
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
