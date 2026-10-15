import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { Link, useRouter } from "@tanstack/react-router";

import { $api } from "@/react-app/lib/queries/fetch-client";

import {
	EditableProvider,
	SelectField,
	SubmitField,
	TextField,
} from "@/react-app/components/forms/fields";
import {
  useListView,
  viewForUrl,
} from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import {
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@/react-app/components/ui/field";
import type {
	DonorInsert,
	DonorSelect,
	DonorUpdate,
} from "@/schemas/zod/contacts";

import { UFS } from "@/schemas/db/contacts";
import { donorInsertSchema, donorUpdateSchema } from "@/schemas/zod/contacts";
import { queryClient } from "@/react-app/lib/query-client";
import { ZodError } from "zod";

export function DonorForm({ donor }: { donor?: DonorSelect }) {
	const router = useRouter();
	const listView = useListView();
	const [isEditing, setIsEditing] = useState(!donor);
	const { mutateAsync: createMutateAsync, isPending: createIsPending } = $api.useMutation("post", "/api/v1/donors");
	const { mutateAsync: updateMutateAsync, isPending: updateIsPending } = $api.useMutation("patch", "/api/v1/donors/{id}");

	const form = useForm({
		defaultValues: donor,
		onSubmit: async ({ value }: { value: DonorUpdate }) => {
			try {
				if (donor) {
					try {
						donorUpdateSchema.parse(value);
					} catch (error) {
						console.log("Update Donor form validation failed", (error as ZodError).issues);
						return;
					}
					await updateMutateAsync({
						params: { path: { id: donor?.id ?? "" } },
						body: value as DonorUpdate,
					});
				} else {
					try {
						donorInsertSchema.parse(value);
					} catch (error) {
						console.log("Create Donor form validation failed", (error as ZodError).issues);
						return;
					}
					await createMutateAsync({ body: value as DonorInsert });
				}
			} catch {
				return;
			}

			await queryClient.invalidateQueries({ queryKey: ["donors"] });
			await router.navigate({
				to: "/contacts/donors",
				search: donor && listView ? viewForUrl(listView) : {},
			});
		},
	});

	const isPending = (createIsPending ?? false) || (updateIsPending ?? false);

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">
					{donor ? "Detalhes do donor" : "Novo donor"}
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					{donor && !isEditing ? (
						<Button size="sm" onClick={() => setIsEditing(true)}>
							Editar
						</Button>
					) : null}
					<Link
						to="/contacts/donors"
						search={donor && listView ? viewForUrl(listView) : {}}
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						Back to list
					</Link>
			</div>
		</div>

		<form
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
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
									<TextField field={field} label="Nome" autoComplete="name" />
								)}
							/>
							<form.Field
								name="phone"
								children={(field) => (
									<TextField
										field={field}
										label="Telefone"
										type="tel"
										autoComplete="tel"
									/>
								)}
							/>
							<form.Field
								name="email"
								children={(field) => (
									<TextField
										field={field}
										label="E-mail"
										type="email"
										autoComplete="email"
									/>
								)}
							/>
						</FieldSet>
						<FieldSet>
							<FieldLegend variant="label">Endereço</FieldLegend>
							<form.Field
								name="cep"
								children={(field) => (
									<TextField field={field} label="CEP" placeholder="01310100" />
								)}
							/>
							<form.Field
								name="logradouro"
								children={(field) => (
									<TextField
										field={field}
										label="Logradouro"
										autoComplete="address-line1"
									/>
								)}
							/>
							<form.Field
								name="numero"
								children={(field) => <TextField field={field} label="Número" />}
							/>
							<form.Field
								name="complemento"
								children={(field) => <TextField field={field} label="Complemento" />}
							/>
							<form.Field
								name="bairro"
								children={(field) => (
									<TextField
										field={field}
										label="Bairro"
										autoComplete="address-level3"
									/>
								)}
							/>
							<form.Field
								name="cidade"
								children={(field) => (
									<TextField
										field={field}
										label="Cidade"
										autoComplete="address-level2"
									/>
								)}
							/>
							<form.Field
								name="uf"
								children={(field) => (
									<SelectField
										field={field}
										label="UF"
										options={UFS.map((value) => ({ value: value, label: value }))}
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
										label={donor ? "Salvar alterações" : "Cadastrar donor"}
										pendingLabel={donor ? "Salvando..." : "Cadastrando..."}
										canSubmit={canSubmit}
										isPending={isPending}
									/>
									)}
								/>
								{donor ? (
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
