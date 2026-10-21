import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { Link, useRouter } from "@tanstack/react-router";

import { EditableProvider } from "@/react-app/components/forms/fields";
import {
	CheckboxField,
	NumberField,
	SelectField,
	SubmitField,
	TextareaField,
	TextField,
} from "@/react-app/components/forms/fields";
import type { SelectOption } from "@/react-app/components/forms/fields";
import { useListView, viewForUrl } from "@/react-app/components/tables/utils/table-view-state";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import {
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@/react-app/components/ui/field";
import type { Beneficiary } from "@/schemas/api/beneficiary";
import { beneficiaryCreateSchema } from "@/schemas/api/beneficiary";
import { ESTADOS_CIVIS, TIPOS_IMOVEL, UFS } from "@/schemas/api/enums";
import { queryClient } from "@/react-app/lib/query-client";
import { $api } from "@/react-app/lib/queries/fetch-client";
import type { BeneficiaryFormValues } from "@/react-app/lib/queries/contacts/beneficiaries";
import { beneficiaryKeys } from "@/react-app/lib/queries/contacts/beneficiaries";

const ufOptions: SelectOption[] = UFS.map((value) => ({ value, label: value }));

function errorFor(values: BeneficiaryFormValues, field: string) {
	const parsed = beneficiaryCreateSchema.safeParse(values);
	if (parsed.success) return undefined;
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

function initialValues(record?: Beneficiary): BeneficiaryFormValues {
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
		tipoImovel: record?.tipoImovel ?? null,
		valorAluguel: record?.valorAluguel ?? null,
		estadoCivil: record?.estadoCivil ?? null,
		numeroAdultos: record?.numeroAdultos ?? null,
		criancasPequenas: record?.criancasPequenas ?? null,
		adolescentes: record?.adolescentes ?? null,
		doentes: record?.doentes ?? null,
		bolsaFamilia: record?.bolsaFamilia ?? null,
		aposentado: record?.aposentado ?? null,
		pensao: record?.pensao ?? null,
		cestaBasica: record?.cestaBasica ?? null,
		atividadeRemunerada: record?.atividadeRemunerada ?? null,
		renda: record?.renda ?? null,
		criancaEscola: record?.criancaEscola ?? null,
		observacoes: record?.observacoes ?? null,
	};
}

export function BeneficiaryForm({
	beneficiary,
}: {
	beneficiary?: Beneficiary;
}) {
	const router = useRouter();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!beneficiary);
	const { mutateAsync: createMutateAsync, isPending: createIsPending } = $api.useMutation("post", "/api/v1/beneficiaries");
	const { mutateAsync: updateMutateAsync, isPending: updateIsPending } = $api.useMutation("patch", "/api/v1/beneficiaries/{id}");

	const form = useForm({
		defaultValues: initialValues(beneficiary),
		onSubmit: async ({ value }) => {
			const parsed = beneficiaryCreateSchema.safeParse(value);
			if (!parsed.success) {
				console.error("validacao falhou", parsed.error.issues);
				return;
			}

			try {
				if (updateMutateAsync && beneficiary) {
					await updateMutateAsync({
						params: { path: { id: beneficiary.id } },
						body: parsed.data,
					});
				} else if (createMutateAsync) {
					await createMutateAsync({ body: parsed.data });
				}
			} catch (error) {
				console.error("Mutation failed:", error);
				return;
			}

			await queryClient.invalidateQueries({ queryKey: beneficiaryKeys.all });

			await router.navigate({
				to: "/contacts/beneficiaries",
				search: lista ? viewForUrl(lista) : {},
			});
		},
	});

	const isPending = (createIsPending ?? false) || (updateIsPending ?? false);

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">
					{beneficiary ? "Detalhes do beneficiário" : "Novo beneficiário"}
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					{beneficiary && !isEditing ? (
						<Button size="sm" onClick={() => setIsEditing(true)}>
							Editar
						</Button>
					) : null}
					<Link
						to="/contacts/beneficiaries"
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
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "cep"),
								}}
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

						<FieldSet>
							<FieldLegend variant="label">Moradia</FieldLegend>
							<form.Field
								name="tipoImovel"
								children={(field) => (
									<SelectField
										field={field}
										label="Tipo de imóvel"
										options={TIPOS_IMOVEL.map((value) => ({ value, label: value }))}
									/>
								)}
							/>
							<form.Field
								name="valorAluguel"
								children={(field) => (
									<NumberField field={field} label="Valor do aluguel" />
								)}
							/>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Perfil</FieldLegend>
							<form.Field
								name="estadoCivil"
								children={(field) => (
									<SelectField
										field={field}
										label="Estado civil"
										options={ESTADOS_CIVIS.map((value) => ({ value, label: value }))}
									/>
								)}
							/>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Composição familiar</FieldLegend>
							<form.Field
								name="numeroAdultos"
								children={(field) => (
									<NumberField field={field} label="Adultos" />
								)}
							/>
							<form.Field
								name="criancasPequenas"
								children={(field) => (
									<NumberField field={field} label="Crianças pequenas" />
								)}
							/>
							<form.Field
								name="adolescentes"
								children={(field) => (
									<NumberField field={field} label="Adolescentes" />
								)}
							/>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Indicadores</FieldLegend>
							<div className="grid gap-4 sm:grid-cols-2">
								<form.Field
									name="cestaBasica"
									children={(field) => (
										<CheckboxField field={field} label="Cesta básica" />
									)}
								/>
								<form.Field
									name="bolsaFamilia"
									children={(field) => (
										<CheckboxField field={field} label="Bolsa família" />
									)}
								/>
								<form.Field
									name="aposentado"
									children={(field) => (
										<CheckboxField field={field} label="Aposentado" />
									)}
								/>
								<form.Field
									name="pensao"
									children={(field) => (
										<CheckboxField field={field} label="Pensão" />
									)}
								/>
								<form.Field
									name="doentes"
									children={(field) => (
										<CheckboxField field={field} label="Doentes na casa" />
									)}
								/>
								<form.Field
									name="atividadeRemunerada"
									children={(field) => (
										<CheckboxField
											field={field}
											label="Atividade remunerada"
										/>
									)}
								/>
								<form.Field
									name="criancaEscola"
									children={(field) => (
										<CheckboxField field={field} label="Criança na escola" />
									)}
								/>
							</div>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Renda</FieldLegend>
							<form.Field
								name="renda"
								children={(field) => (
									<NumberField field={field} label="Renda mensal" step={0.01} />
								)}
							/>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Observações</FieldLegend>
							<form.Field
								name="observacoes"
								children={(field) => (
									<TextareaField field={field} label="Observações" />
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
												beneficiary ? "Salvar alterações" : "Cadastrar beneficiário"
											}
											pendingLabel={beneficiary ? "Salvando..." : "Cadastrando..."}
											canSubmit={canSubmit}
											isPending={isPending}
										/>
									)}
								/>
								{beneficiary ? (
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
