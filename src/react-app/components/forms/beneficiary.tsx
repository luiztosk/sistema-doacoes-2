import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type {
	BeneficiaryInsert,
	BeneficiarySelect,
	BeneficiaryUpdate,
} from "@/schemas/zod/contacts";
import {
	beneficiaryInsertSchema,
	beneficiaryUpdateSchema,
} from "@/schemas/zod/contacts";
import {
	beneficiaryKeys,
	createBeneficiaryOptions,
	updateBeneficiaryOptions,
} from "@/react-app/lib/api/beneficiaries";
import { ESTADOS_CIVIS, TIPOS_IMOVEL, UFS } from "@/schemas/db/contacts";
import { ZodError } from "zod";

const ufOptions: SelectOption[] = UFS.map((value) => ({ value, label: value }));

export function BeneficiaryForm({ beneficiary }: { beneficiary?: BeneficiarySelect }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const lista = useListView();
	const [isEditing, setIsEditing] = useState(!beneficiary);

	const create = useMutation(createBeneficiaryOptions);
	const update = useMutation(updateBeneficiaryOptions(beneficiary?.id ?? ""));

	const form = useForm({
		defaultValues: beneficiary,
		onSubmit: async ({ value }: { value: BeneficiaryUpdate }) => {
			try {
				if (beneficiary) {
					try {
						beneficiaryUpdateSchema.parse(value);
					} catch (error) {
						console.log("Update Beneficiary form validation failed", (error as ZodError).issues);
						return;
					}
					await update.mutateAsync(value as BeneficiaryUpdate);
				} else {
					try {
						beneficiaryInsertSchema.parse(value);
					} catch (error) {
						console.log("Create Beneficiary form validation failed", (error as ZodError).issues);
						return;
					}
					await create.mutateAsync(value as BeneficiaryInsert);
				}
			} catch {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: beneficiaryKeys.all,
			});

			await router.navigate({
				to: "/beneficiaries",
				search: lista ? viewForUrl(lista) : {},
			});
		},
	});

	const isPending = create.isPending || update.isPending;

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
						to="/beneficiaries"
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
								// 		errorFor(fieldApi.form.state.values, "nome"),
								// }}
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
								// validators={{
								// onBlur: ({ fieldApi }) =>
								// errorFor(fieldApi.form.state.values, "email"),
								// }}
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
								// validators={{
								// 	onBlur: ({ fieldApi }) =>
								// 		errorFor(fieldApi.form.state.values, "cep"),
								// }}
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
								// validators={{
								// onBlur: ({ fieldApi }) =>
								// errorFor(fieldApi.form.state.values, "valorAluguel"),
								// }}
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
								// validators={{
								// onBlur: ({ fieldApi }) =>
								// errorFor(fieldApi.form.state.values, "numeroAdultos"),
								// }}
								children={(field) => (
									<NumberField field={field} label="Adultos" />
								)}
							/>
							<form.Field
								name="criancasPequenas"
								// validators={{
								// onBlur: ({ fieldApi }) =>
								// errorFor(fieldApi.form.state.values, "criancasPequenas"),
								// }}
								children={(field) => (
									<NumberField field={field} label="Crianças pequenas" />
								)}
							/>
							<form.Field
								name="adolescentes"
								// validators={{
								// onBlur: ({ fieldApi }) =>
								// errorFor(fieldApi.form.state.values, "adolescentes"),
								// }}
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
								// validators={{
								// 	onBlur: ({ fieldApi }) =>
								// 		errorFor(fieldApi.form.state.values, "renda"),
								// }}
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
