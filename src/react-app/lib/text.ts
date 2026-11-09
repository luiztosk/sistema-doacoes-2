const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export function normalizeText(value: unknown): string {
	return String(value ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function compareText(left: string, right: string): number {
	return collator.compare(left, right);
}
