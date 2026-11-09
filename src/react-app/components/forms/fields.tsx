import type { SelectOption } from "@/react-app/lib/select-options";
import { matchesOption, selectedOption, sortOptions } from "@/react-app/lib/select-options";
import {
	Combobox,
	ComboboxInput,
	ComboboxContent,
	ComboboxList,
	ComboboxItem,
	ComboboxEmpty,
	ComboboxTrigger,
} from "@/react-app/components/ui/combobox";
import { InputGroupAddon, InputGroupButton } from "@/react-app/components/ui/input-group";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

import { formatDate, formatPhone } from "@/react-app/lib/format";

import { Button } from "@/react-app/components/ui/button";
import { Checkbox } from "@/react-app/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldLabel,
} from "@/react-app/components/ui/field";
import { Input } from "@/react-app/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/react-app/components/ui/select";
import { Textarea } from "@/react-app/components/ui/textarea";

const EditableContext = createContext(true);

function useEditable() {
	return useContext(EditableContext);
}

export function EditableProvider({
	editable,
	children,
}: {
	editable: boolean;
	children: ReactNode;
}) {
	return <EditableContext value={editable}>{children}</EditableContext>;
}

type FieldHandle<TValue> = {
	name: string;
	state: { value: TValue; meta: { errors?: readonly unknown[] } };
	handleBlur(): void;
	handleChange(updater: unknown): void;
};

type BaseFieldProps<TValue> = {
	field: FieldHandle<TValue>;
	label: string;
};

function firstError(meta: { errors?: readonly unknown[] }) {
	const first = meta.errors?.[0];
	if (typeof first === "string") {
		return first;
	}
	if (first && typeof first === "object" && "message" in first) {
		const { message } = first as { message?: unknown };
		return typeof message === "string" ? message : undefined;
	}
	return undefined;
}

const invalid = (error: string | undefined) => (error ? true : undefined);

export function TextField({
	field,
	label,
	placeholder,
	autoComplete,
	type = "text",
}: BaseFieldProps<string | null | undefined> & {
	placeholder?: string;
	autoComplete?: string;
	type?: "text" | "email" | "tel";
}) {
	const error = firstError(field.state.meta);
	const editable = useEditable();

	return (
		<Field data-invalid={invalid(error)}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Input
				id={field.name}
				name={field.name}
				type={type}
				autoComplete={autoComplete}
				placeholder={placeholder}
				disabled={!editable}
				value={
					!editable && type === "tel"
						? formatPhone(field.state.value)
						: field.state.value ?? ""
				}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value || null)}
				aria-invalid={invalid(error)}
			/>
			<FieldError>{error}</FieldError>
		</Field>
	);
}

export function TextareaField({ field, label }: BaseFieldProps<string | null>) {
	const error = firstError(field.state.meta);
	const editable = useEditable();

	return (
		<Field data-invalid={invalid(error)}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Textarea
				id={field.name}
				name={field.name}
				disabled={!editable}
				value={field.state.value ?? ""}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value || null)}
				aria-invalid={invalid(error)}
			/>
			<FieldError>{error}</FieldError>
		</Field>
	);
}

export function NumberField({
	field,
	label,
	step = 1,
	min = 0,
}: BaseFieldProps<number | null | undefined> & { step?: number; min?: number }) {
	const error = firstError(field.state.meta);
	const editable = useEditable();

	return (
		<Field data-invalid={invalid(error)}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Input
				id={field.name}
				name={field.name}
				type="number"
				inputMode="decimal"
				step={step}
				min={min}
				disabled={!editable}
				value={field.state.value ?? ""}
				onBlur={field.handleBlur}
				onChange={(e) => {
					const parsed = Number(e.target.value);
					field.handleChange(
						e.target.value === "" || !Number.isFinite(parsed) ? null : parsed,
					);
				}}
				aria-invalid={invalid(error)}
			/>
			<FieldError>{error}</FieldError>
		</Field>
	);
}

export type { SelectOption } from "@/react-app/lib/select-options";

export function SelectField({
	field,
	label,
	options,
	placeholder = "Não informado",
}: BaseFieldProps<string | null> & {
	options: readonly SelectOption[];
	placeholder?: string;
}) {
	const error = firstError(field.state.meta);
	const editable = useEditable();

	return (
		<Field data-invalid={invalid(error)}>
			<FieldLabel>{label}</FieldLabel>
			<Select
				value={field.state.value}
				name={field.name}
				items={options}

				disabled={!editable}
				onValueChange={(value) => field.handleChange(value)}
			>
				<SelectTrigger
					id={field.name}
					className="w-full"
					aria-invalid={invalid(error)}
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<FieldError>{error}</FieldError>
		</Field>
	);
}

export function SearchableSelectField({
	field,
	label,
	options,
	placeholder = "Digite para buscar",
}: BaseFieldProps<string | null> & {
	options: readonly SelectOption[];
	placeholder?: string;
}) {
	const error = firstError(field.state.meta);
	const editable = useEditable();
	const sorted = useMemo(() => sortOptions(options), [options]);
	const selected = selectedOption(sorted, field.state.value);
	const errorId = `${field.name}-error`;

	return (
		<Field data-invalid={invalid(error)}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Combobox
				items={sorted}
				value={selected}
				name={field.name}
				disabled={!editable}
				filter={matchesOption}
				autoHighlight
				isItemEqualToValue={(option, value) => option.value === value.value}
				onValueChange={(option) => field.handleChange(option?.value ?? null)}
			>
				<ComboboxInput
					id={field.name}
					placeholder={placeholder}
					disabled={!editable}
					onBlur={field.handleBlur}
					aria-invalid={invalid(error)}
					aria-describedby={error ? errorId : undefined}
					showTrigger={false}
					className="w-full"
				>
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							render={<ComboboxTrigger />}
							aria-label={`Mostrar opções: ${label}`}
							disabled={!editable}
							size="icon-xs"
							variant="ghost"
						/>
					</InputGroupAddon>
				</ComboboxInput>
				<ComboboxContent>
					<ComboboxEmpty>Nenhuma opção encontrada.</ComboboxEmpty>
					<ComboboxList>
						{(option: SelectOption) => (
							<ComboboxItem key={option.value} value={option}>{option.label}</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
			<FieldError id={errorId}>{error}</FieldError>
		</Field>
	);
}

export function CheckboxField({ field, label }: BaseFieldProps<boolean | null | undefined>) {
	const labelId = `${field.name}-label`;
	const editable = useEditable();

	return (
		<Field orientation="horizontal">
			<FieldLabel className="flex-row items-center gap-2">
				<Checkbox
					name={field.name}
					disabled={!editable}
					checked={field.state.value === true}
					onCheckedChange={(checked) => field.handleChange(checked === true)}
					aria-labelledby={labelId}
				/>
				<span id={labelId}>{label}</span>
			</FieldLabel>
		</Field>
	);
}

type SubmitFieldProps = {
	label: string;
	pendingLabel: string;
	canSubmit: boolean;
	isPending: boolean;
};

/**
 * A data é o ISO 8601 do contrato, e não um `Date`: o estado do formulário é
 * o payload, e o que a API aceita é a string. O `type="date"` do input não
 * tem fuso, então a data escolhida vira o início do dia local — que é o que
 * a pessoa digitou.
 */
export function DateField({ field, label }: BaseFieldProps<string | null>) {
	const error = firstError(field.state.meta);
	const editable = useEditable();

	const date = field.state.value ? new Date(field.state.value) : null;
	const valueStr = date && !Number.isNaN(date.getTime())
		? new Date(
				date.getTime() - date.getTimezoneOffset() * 60000,
			)
				.toISOString()
				.split("T")[0]
		: "";

	return (
		<Field data-invalid={invalid(error)}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Input
				id={field.name}
				name={field.name}
				type={editable ? "date" : "text"}
				disabled={!editable}
				value={editable ? valueStr : formatDate(field.state.value)}
				onBlur={field.handleBlur}
				onChange={(e) => {
					const d = e.target.value ? new Date(e.target.value + "T00:00:00") : null;
					field.handleChange(d ? d.toISOString() : null);
				}}
				aria-invalid={invalid(error)}
			/>
			<FieldError>{error}</FieldError>
		</Field>
	);
}

export function SubmitField({
	label,
	pendingLabel,
	canSubmit,
	isPending,
}: SubmitFieldProps) {
	return (
		<Button type="submit" disabled={!canSubmit || isPending}>
			{isPending ? pendingLabel : label}
		</Button>
	);
}
