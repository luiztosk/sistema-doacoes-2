import { useLocation } from "@tanstack/react-router";
import type { TableViewState } from "@/react-app/lib/table-view";

export {
	defaultPageSize,
	paginationFromView,
	sortingFromView,
	sortingToView,
	tableViewSchemaFor,
	viewForUrl,
} from "@/react-app/lib/table-view";
export type { TableViewState } from "@/react-app/lib/table-view";

declare module "@tanstack/history" {
	interface HistoryState {
		lista?: TableViewState;
	}
}

export function useListView(): TableViewState | undefined {
	return useLocation({ select: (location) => location.state.lista });
}
