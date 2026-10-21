export type SelectOption = {
	value: string;
	label: string;
};

/**
 * As opções de um campo que aponta para outro registro. O label é o nome do
 * registro, e o valor é o id — a mesma linha que a API devolve.
 */
export function fkOptions(
	items?: readonly { id: string; name: string }[],
): SelectOption[] {
	return (items ?? []).map((item) => ({
		value: item.id,
		label: item.name,
	}));
}
