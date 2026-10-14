import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider } from "@/react-app/components/forms/fields";
import { SubmitField, TextField } from "@/react-app/components/forms/fields";
import { useListView, viewForUrl } from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import type {
	ItemCategorySelect,
	// ItemCategoryFormValues,
} from "@/schemas/zod/inventory";
import { itemCategoryInsertSchema } from "@/schemas/zod/inventory";
import { queryClient } from "@/react-app/lib/query-client";

// function initialValues(record?: ItemCategorySelect): ItemCategoryFormValues {
// 	return {
// 		name: record?.name ?? "",
// 	};
// }

export function CategoryForm({ itemCategory, createMutation, updateMutation }: {
	itemCategory?: ItemCategorySelect;
	createMutation?: ReturnType<typeof import("@/react-app/lib/queries/fetch-client").$api.useMutation>;
	updateMutation?: ReturnType<typeof import("@/react-app/lib/queries/fetch-client").$api.useMutation>;
}) {
	const router = useRouter();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!itemCategory);

	const form = useForm({
		// defaultValues: initialValues(itemCategory),
		defaultValues: itemCategory,
		onSubmit: async ({ value }) => {
			if (!itemCategoryInsertSchema.safeParse(value).success) {
				return;
			}

			try {
				if (itemCategory) {
					await updateMutation?.mutateAsync({ body: value });
				} else {
					await createMutation?.mutateAsync({ body: value });
				}
			} catch {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: ["item-categories"],
			});

			await router.navigate({
				to: "/inventory/categories",
				search: lista ? viewForUrl(lista) : {},
			});
		},
	});

	const isPending = createMutation?.isPending || updateMutation?.isPending;

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
						to="/inventory/categories"
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