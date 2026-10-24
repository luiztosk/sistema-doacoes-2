import { useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { functionalUpdate } from "@tanstack/react-table";
import type { PaginationState, SortingState, Updater } from "@tanstack/react-table";
import type { TableListPath, TableViewState } from "@/react-app/lib/table-view";
import { paginationFromView, sortingFromView, sortingToView, tableViews, viewForUrl } from "@/react-app/lib/table-view";

export function useTableView(view: TableViewState, path: TableListPath) {
	const navigate = useNavigate();
	const sort = view.sort ?? tableViews[path].sort;
	const navigateToView = useCallback(
		(next: TableViewState) => navigate({ to: path, search: viewForUrl({ ...next, sort: next.sort ?? tableViews[path].sort }), replace: true }),
		[navigate, path],
	);

	useEffect(() => {
		if (!view.sort) navigateToView({ ...view, sort });
	}, [navigateToView, sort, view]);

	return {
		navigateToView,
		state: { pagination: paginationFromView(view), sorting: sortingFromView(sort) },
		onPaginationChange: (updater: Updater<PaginationState>) => {
			const next = functionalUpdate(updater, paginationFromView(view));
			navigateToView({ page: next.pageIndex, pageSize: next.pageSize, sort });
		},
		onSortingChange: (updater: Updater<SortingState>) => {
			const next = functionalUpdate(updater, sortingFromView(sort));
			navigateToView({ page: 0, pageSize: view.pageSize, sort: sortingToView(next, tableViews[path].sort) });
		},
	};
}

export function useTablePageClamp(view: TableViewState, total: number, navigateToView: (view: TableViewState) => unknown) {
	useEffect(() => {
		const { pageIndex, pageSize } = paginationFromView(view);
		if (pageIndex > 0 && pageIndex * pageSize >= total) {
			navigateToView({ page: 0, pageSize: view.pageSize, sort: view.sort });
		}
	}, [navigateToView, total, view]);
}
