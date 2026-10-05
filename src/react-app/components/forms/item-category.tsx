import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider } from "@/react-app/components/forms/fields";
import { SubmitField, TextField } from "@/react-app/components/forms/fields";
import { useListView, viewForUrl } from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import type {
	ItemCategoryCompleto,
	ItemCategoryFormValues,
} from "@/react-app/lib/api/item-categories";
import {
	itemCategoryKeys,
	createItemCategoryOptions,
	updateItemCategoryOptions,
} from "@/react-app/lib/api/item-categories";
import { itemCategoryInsertSchema } from "@/worker/db/schema";

type ItemCategoryFormProps = {
	itemCategory?: ItemCategoryCompleto;
};

function initialValues(record?: ItemCategoryCompleto): ItemCategoryFormValues {
	return {
		name: record?.name ?? "",
	};
}

function errorFor(values: ItemCategoryFormValues, field: string) {
	const parsed = itemCategoryInsertSchema.safeParse(values);
	if (parsed.success) {
		return undefined;
	}
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

export function ItemCategoryForm({ itemCategory }: ItemCategoryFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!itemCategory);

	const create = useMutation(createItemCategoryOptions);
	const update = useMutation(
		updateItemCategoryOptions(itemCategory?.id ?? ""),
	);

	const form = useForm({
		defaultValues: initialValues(itemCategory),
		onSubmit: async ({ value }) => {
			if (!itemCategoryInsertSchema.safeParse(value).success) {
				return;
			}

			try {
				if (itemCategory) {
					await update.mutateAsync(value);
				} else {
					await create.mutateAsync(value);
				}
			} catch {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: itemCategoryKeys.all,
			});

			await router.navigate({
				to: "/item-categories",
				search: lista ? viewForUrl(lista) : {},
			});
		},
	});

	const isPending = create.isPending || update.isPending;

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">
					{itemCategory ? "Detalhes da categoria" : "Nova categoria"}
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					{itemCategory && !isEditing ? (
						<Button size="sm" onClick={() => setIsEditing(true)}>
							Editar
						</Button>
					) : null}
					<Link
						to="/item-categories"
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

						{isEditing ? (
							<div className="flex flex-wrap items-center gap-2">
								<form.Subscribe
									selector={(state) => [state.canSubmit]}
									children={([canSubmit]) => (
										<SubmitField
											label={
												itemCategory
													? "Salvar alterações"
													: "Cadastrar categoria"
											}
											pendingLabel={
												itemCategory ? "Salvando..." : "Cadastrando..."
											}
											canSubmit={canSubmit}
											isPending={isPending}
										/>
									)}
								/>
								{itemCategory ? (
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
