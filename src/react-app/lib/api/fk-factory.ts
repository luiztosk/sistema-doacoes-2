export type SelectOption = {
	value: string;
	label: string;
};

export function fkOptions(
	_resource: "beneficiaries" | "doadores" | "inventory-items" | "item-categories",
	items?: { id: string; name?: string; nome?: string }[],
): SelectOption[] {
	if (items) {
		return items.map((r) => ({
			value: r.id,
			label: r.name ?? r.nome ?? r.id,
		}));
	}
	return [];
}
