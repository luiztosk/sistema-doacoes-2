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
import type { SelectOption } from "@/react-app/components/forms/fields";
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
import type { Donor } from "@/schemas/api/donor";
import { donorCreateSchema } from "@/schemas/api/donor";
import { UFS } from "@/schemas/api/enums";
import { queryClient } from "@/react-app/lib/query-client";
import type { DonorFormValues } from "@/react-app/lib/queries/contacts/donors";
import { donorKeys } from "@/react-app/lib/queries/contacts/donors";

const ufOptions: SelectOption[] = UFS.map((value) => ({ value, label: value }));

function errorFor(values: DonorFormValues, field: string) {
	const parsed = donorCreateSchema.safeParse(values);
	if (parsed.success) return undefined;
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

function initialValues(record?: Donor): DonorFormValues {
	return {
		name: record?.name ?? "",
		phone: record?.phone ?? "",
		email: record?.email ?? null,
		cep: record?.cep ?? null,
		logradouro: record?.logradouro ?? null,
		numero: record?.numero ?? null,
		complemento: record?.complemento ?? null,
		bairro: record?.bairro ?? "",
		cidade: record?.cidade ?? "",
		uf: record?.uf ?? null,
	};
}

export function DonorForm({ donor }: { donor?: Donor }) {
	const router = useRouter();
	const listView = useListView();
	const [isEditing, setIsEditing] = useState(!donor);
	const { mutateAsync: createMutateAsync, isPending: createIsPending } = $api.useMutation("post", "/api/v1/donors");
	const { mutateAsync: updateMutateAsync, isPending: updateIsPending } = $api.useMutation("patch", "/api/v1/donors/{id}");

	const form = useForm({
		defaultValues: initialValues(donor),
		onSubmit: async ({ value }) => {
			const parsed = donorCreateSchema.safeParse(value);
			if (!parsed.success) {
				console.error("validacao falhou", parsed.error.issues);
				return;
			}

			try {
				if (donor) {
					await updateMutateAsync({
						params: { path: { id: donor.id } },
						body: parsed.data,
					});
				} else {
					await createMutateAsync({ body: parsed.data });
				}
			} catch (error) {
				console.error("Mutation failed:", error);
				return;
			}

			await queryClient.invalidateQueries({ queryKey: donorKeys.all });

			await router.navigate({
				to: "/contacts/donors",
				search: listView ? viewForUrl(listView) : {},
			});
		},
	});

	const isPending = (createIsPending ?? false) || (updateIsPending ?? false);

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">
					{donor ? "Detalhes do doador" : "Novo doador"}
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					{donor && !isEditing ? (
						<Button size="sm" onClick={() => setIsEditing(true)}>
							Editar
						</Button>
					) : null}
					<Link
						to="/contacts/donors"
						search={listView ? viewForUrl(listView) : {}}
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
									<TextField
										field={field}
										label="Nome"
										autoComplete="name"
									/>
								)}
							/>
							<form.Field
								name="phone"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "phone"),
								}}
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
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "email"),
								}}
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
									<TextField
										field={field}
										label="CEP"
										placeholder="01310100"
									/>
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
								children={(field) => (
									<TextField field={field} label="Número" />
								)}
							/>
							<form.Field
								name="complemento"
								children={(field) => (
									<TextField field={field} label="Complemento" />
								)}
							/>
							<form.Field
								name="bairro"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "bairro"),
								}}
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
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "cidade"),
								}}
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
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "uf"),
								}}
								children={(field) => (
									<SelectField
										field={field}
										label="UF"
										options={ufOptions}
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
											label={donor ? "Salvar alterações" : "Cadastrar doador"}
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
