import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";

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
} from "@/react-app/components/tables/table-view-state";
import { Button } from "@/react-app/components/ui/button";
import {
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@/react-app/components/ui/field";
import type {
	DoadorCompleto,
	DoadorFormValues,
} from "@/react-app/lib/api/doadores";
import {
	createDoadorOptions,
	doadorKeys,
	updateDoadorOptions,
} from "@/react-app/lib/api/doadores";
import { UFS, doadorInsertSchema } from "@/worker/db/schema";

type DoadorFormProps = {
	doador?: DoadorCompleto;
};

const ufOptions: SelectOption[] = UFS.map((value) => ({ value, label: value }));

function initialValues(record?: DoadorCompleto): DoadorFormValues {
	return {
		nome: record?.nome ?? "",
		telefone: record?.telefone ?? null,
		email: record?.email ?? null,
		cep: record?.cep ?? null,
		logradouro: record?.logradouro ?? null,
		numero: record?.numero ?? null,
		complemento: record?.complemento ?? null,
		bairro: record?.bairro ?? null,
		cidade: record?.cidade ?? null,
		uf: record?.uf ?? null,
	};
}

function errorFor(values: DoadorFormValues, field: string) {
	const parsed = doadorInsertSchema.safeParse(values);
	if (parsed.success) {
		return undefined;
	}
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

export function DoadorForm({ doador }: DoadorFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const listView = useListView();
	const [isEditing, setIsEditing] = useState(!doador);
	const create = useMutation(createDoadorOptions);
	const update = useMutation(updateDoadorOptions(doador?.id ?? ""));

	const form = useForm({
		defaultValues: initialValues(doador),
		onSubmit: async ({ value }) => {
			if (!doadorInsertSchema.safeParse(value).success) {
				return;
			}

			try {
				if (doador) {
					await update.mutateAsync(value);
				} else {
					await create.mutateAsync(value);
				}
			} catch {
				return;
			}

			await queryClient.invalidateQueries({ queryKey: doadorKeys.all });
			await router.navigate({
				to: "/doadores",
				search: doador && listView ? viewForUrl(listView) : {},
			});
		},
	});

	const isPending = create.isPending || update.isPending;

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">
					{doador ? "Detalhes do doador" : "Novo doador"}
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					{doador && !isEditing ? (
						<Button size="sm" onClick={() => setIsEditing(true)}>
							Editar
						</Button>
					) : null}
					<Button
						variant="outline"
						size="sm"
						nativeButton={false}
						render={
							<Link
								to="/doadores"
								search={doador && listView ? viewForUrl(listView) : {}}
							/>
						}
					>
						Voltar para a lista
					</Button>
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
								name="nome"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "nome"),
								}}
								children={(field) => (
									<TextField field={field} label="Nome" autoComplete="name" />
								)}
							/>
							<form.Field
								name="telefone"
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
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "cep"),
								}}
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
											label={doador ? "Salvar alterações" : "Cadastrar doador"}
											pendingLabel={doador ? "Salvando..." : "Cadastrando..."}
											canSubmit={canSubmit}
											isPending={isPending}
										/>
									)}
								/>
								{doador ? (
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
