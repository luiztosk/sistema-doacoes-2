import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider } from "@/react-app/components/forms/fields";
import { SubmitField, TextField } from "@/react-app/components/forms/fields";
import { useListView, viewForUrl } from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/react-app/components/ui/field";
import type { ItemCategory } from "@/schemas/api/category";
import { categoryCreateSchema } from "@/schemas/api/category";
import { $api } from "@/react-app/lib/queries/fetch-client";
import { queryClient } from "@/react-app/lib/query-client";
import type { CategoryFormValues } from "@/react-app/lib/queries/inventory/categories";
import { categoryKeys } from "@/react-app/lib/queries/inventory/categories";

function errorFor(values: CategoryFormValues, field: string) {
	const parsed = categoryCreateSchema.safeParse(values);
	if (parsed.success) return undefined;
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

function initialValues(record?: ItemCategory): CategoryFormValues {
	return { name: record?.name ?? "" };
}

export function CategoryForm({ itemCategory }: {
	itemCategory?: ItemCategory;
}) {
	const router = useRouter();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!itemCategory);
	const { mutateAsync: createMutateAsync, isPending: createIsPending } = $api.useMutation("post", "/api/v1/inventory/categories");
	const { mutateAsync: updateMutateAsync, isPending: updateIsPending } = $api.useMutation("patch", "/api/v1/inventory/categories/{id}");

	const form = useForm({
		defaultValues: initialValues(itemCategory),
		onSubmit: async ({ value }) => {
			const parsed = categoryCreateSchema.safeParse(value);
			if (!parsed.success) {
				console.error("validacao falhou", parsed.error.issues);
				return;
			}

			try {
				if (itemCategory) {
					await updateMutateAsync({ params: { path: { id: itemCategory.id } }, body: parsed.data });
				} else {
					await createMutateAsync({ body: parsed.data });
				}
			} catch (error) {
				console.error("Mutation failed:", error);
				return;
			}

			await queryClient.invalidateQueries({ queryKey: categoryKeys.all });

			await router.navigate({
				to: "/inventory/category",
				search: lista ? viewForUrl(lista) : {},
			});
		},
	});

	const isPending = (createIsPending ?? false) || (updateIsPending ?? false);

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
						to="/inventory/category"
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