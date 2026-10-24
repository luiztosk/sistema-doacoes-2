import type { PaginationState, SortingState } from "@tanstack/react-table";
import { z } from "zod";

export const defaultPageSize = 20;

export const tableViews = {
	"/contacts/beneficiaries": { sort: "name.asc", columns: ["name", "cityLabel", "phone", "email", "renda", "tipoImovel", "cestaBasica"] },
	"/contacts/donors": { sort: "name.asc", columns: ["name", "cityLabel", "telefone", "email"] },
	"/inventory/item": { sort: "name.asc", columns: ["name", "categoryName", "unit", "onHand", "reserved", "available"] },
	"/inventory/category": { sort: "name.asc", columns: ["name"] },
	"/inventory/donations": { sort: "occurredAt.desc", columns: ["occurredAt", "donorId", "status", "note"] },
	"/inventory/delivery": { sort: "occurredAt.desc", columns: ["occurredAt", "beneficiaryId", "status", "note"] },
	"/inventory/stock": { sort: "name.asc", columns: ["name", "categoryName", "unit", "onHand", "reserved", "available"] },
	"/inventory/ledger": { sort: "seq.asc", columns: ["seq"] },
} as const;

export type TableListPath = keyof typeof tableViews;

export const tableViewSchema = z.object({
	page: z.coerce.number().int().min(0).optional().catch(undefined),
	pageSize: z.coerce.number().int().min(1).optional().catch(undefined),
	sort: z.string().regex(/^[\w]+\.(asc|desc)$/).optional().catch(undefined),
});

export type TableViewState = z.infer<typeof tableViewSchema>;

export function tableViewSchemaFor(path: TableListPath) {
	const policy = tableViews[path];
	const sorts = path === "/inventory/ledger"
		? [policy.sort]
		: policy.columns.flatMap((column) => [`${column}.asc`, `${column}.desc`]);
	return tableViewSchema.extend({
		sort: z.enum(sorts).optional().catch(undefined),
	});
}

export function paginationFromView(view: TableViewState): PaginationState {
	return { pageIndex: view.page ?? 0, pageSize: view.pageSize ?? defaultPageSize };
}

export function sortingFromView(sort: string | undefined, fallback = "name.asc"): SortingState {
	const value = tableViewSchema.shape.sort.parse(sort) ?? fallback;
	const [id, direction] = value.split(".");
	return [{ id, desc: direction === "desc" }];
}

export function sortingToView(sorting: SortingState, fallback = "name.asc"): string {
	const [current] = sorting;
	return current ? `${current.id}.${current.desc ? "desc" : "asc"}` : fallback;
}

export function viewForUrl(view: TableViewState): TableViewState {
	return {
		page: view.page && view.page > 0 ? view.page : undefined,
		pageSize: view.pageSize && view.pageSize !== defaultPageSize ? view.pageSize : undefined,
		sort: view.sort,
	};
}
