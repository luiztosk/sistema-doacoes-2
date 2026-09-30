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
import { Button } from "@/react-app/components/ui/button";
import {
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@/react-app/components/ui/field";
import type {
	AssistidoCompleto,
	AssistidoFormValues,
} from "@/react-app/lib/api/assistidos";
import {
	assistidoKeys,
	createAssistidoOptions,
	updateAssistidoOptions,
} from "@/react-app/lib/api/assistidos";
import {
	ESTADOS_CIVIS,
	TIPOS_IMOVEL,
	UFS,
	assistidoInsertSchema,
} from "@/worker/db/schema";

type AssistidoFormProps = {
	assistido?: AssistidoCompleto;
};

const tipoImovelOptions: SelectOption[] = TIPOS_IMOVEL.map((value) => ({
	value,
	label: value === "ALUGADO" ? "Alugado" : "Próprio",
}));

const estadoCivilOptions: SelectOption[] = ESTADOS_CIVIS.map((value) => ({
	value,
	label:
		{
			SOLTEIRO: "Solteiro",
			CASADO: "Casado",
			DIVORCIADO: "Divorciado",
			VIUVO: "Viúvo",
			UNIAO_ESTAVEL: "União estável",
		}[value] ?? value,
}));

const ufOptions: SelectOption[] = UFS.map((value) => ({ value, label: value }));

function initialValues(record?: AssistidoCompleto): AssistidoFormValues {
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
		tipoImovel: record?.tipoImovel ?? null,
		valorAluguel: record?.valorAluguel ?? null,
		estadoCivil: record?.estadoCivil ?? null,
		numeroAdultos: record?.numeroAdultos ?? null,
		criancasPequenas: record?.criancasPequenas ?? null,
		adolescentes: record?.adolescentes ?? null,
		doentes: record?.doentes ?? false,
		bolsaFamilia: record?.bolsaFamilia ?? false,
		aposentado: record?.aposentado ?? false,
		pensao: record?.pensao ?? false,
		cestaBasica: record?.cestaBasica ?? false,
		atividadeRemunerada: record?.atividadeRemunerada ?? false,
		renda: record?.renda ?? null,
		criancaEscola: record?.criancaEscola ?? false,
		observacoes: record?.observacoes ?? null,
	};
}

function errorFor(values: AssistidoFormValues, field: string) {
	const parsed = assistidoInsertSchema.safeParse(values);
	if (parsed.success) {
		return undefined;
	}
	return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

export function AssistidoForm({ assistido }: AssistidoFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isEditing, setIsEditing] = useState(!assistido);

	const create = useMutation(createAssistidoOptions);
	const update = useMutation(updateAssistidoOptions(assistido?.id ?? ""));

	const form = useForm({
		defaultValues: initialValues(assistido),
		onSubmit: async ({ value }) => {
			if (!assistidoInsertSchema.safeParse(value).success) {
				return;
			}

			if (assistido) {
				update.mutate(value);
			} else {
				create.mutate(value);
			}

			await queryClient.invalidateQueries({
				queryKey: assistidoKeys.all,
			});

			await router.invalidate();
			router.navigate({ to: "/assistidos" });
		},
	});

	const isPending = create.isPending || update.isPending;

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">
					{assistido ? "Detalhes do assistido" : "Novo assistido"}
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					{assistido && !isEditing ? (
						<Button size="sm" onClick={() => setIsEditing(true)}>
							Editar
						</Button>
					) : null}
					<Button
						variant="outline"
						size="sm"
						nativeButton={false}
						render={<Link to="/assistidos" />}
					>
						Voltar para a lista
					</Button>
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
								name="nome"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "nome"),
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
										options={tipoImovelOptions}
									/>
								)}
							/>
							<form.Field
								name="valorAluguel"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "valorAluguel"),
								}}
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
										options={estadoCivilOptions}
									/>
								)}
							/>
						</FieldSet>

						<FieldSet>
							<FieldLegend variant="label">Composição familiar</FieldLegend>
							<form.Field
								name="numeroAdultos"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "numeroAdultos"),
								}}
								children={(field) => (
									<NumberField field={field} label="Adultos" />
								)}
							/>
							<form.Field
								name="criancasPequenas"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "criancasPequenas"),
								}}
								children={(field) => (
									<NumberField field={field} label="Crianças pequenas" />
								)}
							/>
							<form.Field
								name="adolescentes"
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "adolescentes"),
								}}
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
								validators={{
									onBlur: ({ fieldApi }) =>
										errorFor(fieldApi.form.state.values, "renda"),
								}}
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
												assistido ? "Salvar alterações" : "Cadastrar assistido"
											}
											pendingLabel={assistido ? "Salvando..." : "Cadastrando..."}
											canSubmit={canSubmit}
											isPending={isPending}
										/>
									)}
								/>
								{assistido ? (
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
