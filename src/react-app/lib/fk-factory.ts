import type { SelectOption } from "./select-options";

export function fkOptions(
	items?: readonly { id: string; name: string }[],
): SelectOption[] {
	return (items ?? []).map((item) => ({
		value: item.id,
		label: item.name,
	}));
}
