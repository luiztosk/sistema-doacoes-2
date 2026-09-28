export type CsvCastContext = {
	column?: string | number;
	quoting?: boolean;
};

export function castCsvValue(value: string, context: CsvCastContext) {
	if (value === "" && !context.quoting) return null;
	if (context.column === "dataHora" || context.column === "createdAt") {
		return new Date(value);
	}

	if (value === "True") return true;
	if (value === "False") return false;

	return value;
}
