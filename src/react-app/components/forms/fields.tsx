import type { ReactNode } from "react";
import { createContext, useContext } from "react";

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
}: BaseFieldProps<string | null> & {
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
				value={field.state.value ?? ""}
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
}: BaseFieldProps<number | null> & { step?: number; min?: number }) {
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

export type SelectOption = {
	value: string;
	label: string;
};

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

export function CheckboxField({ field, label }: BaseFieldProps<boolean | null>) {
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

export function DateField({ field, label }: BaseFieldProps<Date | null>) {
	const error = firstError(field.state.meta);
	const editable = useEditable();

	const valueStr = field.state.value
		? new Date(field.state.value.getTime() - field.state.value.getTimezoneOffset() * 60000)
				.toISOString()
				.split("T")[0]
		: "";

	return (
		<Field data-invalid={invalid(error)}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Input
				id={field.name}
				name={field.name}
				type="date"
				disabled={!editable}
				value={valueStr}
				onBlur={field.handleBlur}
				onChange={(e) => {
				const d = e.target.value ? new Date(e.target.value + "T00:00:00") : null;
				field.handleChange(d);
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
