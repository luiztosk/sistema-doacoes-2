import { compareText, normalizeText } from "./text";

export type SelectOption = { value: string; label: string };

export function sortOptions(options: readonly SelectOption[]): SelectOption[] {
	return [...options].sort((left, right) => compareText(left.label, right.label));
}

export function matchesOption(option: SelectOption, query: string): boolean {
	return normalizeText(option.label).includes(normalizeText(query));
}

export function selectedOption(options: readonly SelectOption[], value: string | null): SelectOption | null {
	if (!value) return null;
	return options.find((option) => option.value === value) ?? { value, label: value };
}
