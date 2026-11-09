const empty = "—";

export function formatDate(value: string | null | undefined, timeZone?: string) {
	if (!value) {
		return empty;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return empty;
	}

	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone,
	}).format(date);
}

export function formatPhone(value: string | null | undefined) {
	if (!value) {
		return empty;
	}

	const match = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(value);
	return match ? `(${match[1]}) ${match[2]}-${match[3]}` : value;
}

export function compareDates(left: string, right: string) {
	const difference = Date.parse(left) - Date.parse(right);
	return Number.isNaN(difference) ? 0 : difference;
}
