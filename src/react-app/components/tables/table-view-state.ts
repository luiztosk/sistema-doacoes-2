import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useLocation } from "@tanstack/react-router";
import { z } from "zod";

declare module "@tanstack/history" {
	interface HistoryState {
		lista?: TableViewState;
	}
}

type TableSort = {
	id: string;
	desc: boolean;
};

const defaultSort: TableSort = { id: "nome", desc: false };

export const defaultPageSize = 20;

export const initialSort = `${defaultSort.id}.${
	defaultSort.desc ? "desc" : "asc"
}`;

export const tableViewSchema = z.object({
	page: z.coerce.number().int().min(0).optional().catch(undefined),
	pageSize: z.coerce.number().int().min(1).optional().catch(undefined),
	sort: z.string().optional().catch(undefined),
});

export type TableViewState = z.infer<typeof tableViewSchema>;

export function paginationFromView(view: TableViewState): PaginationState {
	return {
		pageIndex: view.page ?? 0,
		pageSize: view.pageSize ?? defaultPageSize,
	};
}

export function sortingFromView(sort: string | undefined): SortingState {
	const [id, direction] = (sort ?? "").split(".");
	if (id === "" || (direction !== "asc" && direction !== "desc")) {
		return [defaultSort];
	}
	return [{ id, desc: direction === "desc" }];
}

export function sortingToView(sorting: SortingState): string {
	const [current] = sorting;
	if (!current) {
		return initialSort;
	}
	return `${current.id}.${current.desc ? "desc" : "asc"}`;
}

export function viewForUrl(view: {
	page?: number;
	pageSize?: number;
	sort?: string;
}): TableViewState {
	return {
		page: view.page && view.page > 0 ? view.page : undefined,
		pageSize:
			view.pageSize && view.pageSize !== defaultPageSize
				? view.pageSize
				: undefined,
		sort: view.sort && view.sort !== initialSort ? view.sort : undefined,
	};
}

export function useListView(): TableViewState | undefined {
	return useLocation({ select: (location) => location.state.lista });
}
