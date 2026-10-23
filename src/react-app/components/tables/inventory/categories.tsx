import { createContext, useContext } from "react";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/react-app/components/ui/button";
import { compareText } from "@/react-app/lib/text";
import type { TableViewState } from "@/react-app/components/tables/utils/table-view-state";
import { useTableView, useTablePageClamp } from "@/react-app/components/tables/utils/use-table-view";
import { createColumnHelper, useTable } from "@tanstack/react-table";

import type { ItemCategory } from "@/schemas/api/category";
import type { DataTableFeatures } from "@/react-app/components/tables/utils/table-features";
import { ariaSort, features } from "@/react-app/components/tables/utils/table-features";
import { TablePagination } from "@/react-app/components/tables/utils/table-pagination";
import { SortableHeader } from "@/react-app/components/tables/utils/table-sortable-header";
import {
	TableToolbar,
} from "@/react-app/components/tables/utils/table-toolbar";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/react-app/components/ui/table";

const searchable = new Set(["name"]);

const ListViewContext = createContext<TableViewState>({});

function DetailsLink({ id }: { id: string }) {
	const view = useContext(ListViewContext);
	return (
		<Link to="/inventory/category/$id" params={{ id }} state={{ lista: view }} className={buttonVariants({ variant: "outline", size: "xs" })}>
			Mais detalhes
		</Link>
	);
}

const columnHelper = createColumnHelper<DataTableFeatures, ItemCategory>();

const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		header: ({ column }) => <SortableHeader column={column} label="Nome" />,
		filterFn: "includesString",
		sortFn: (left, right, columnId) => compareText(left.getValue(columnId), right.getValue(columnId)),
	}),
	columnHelper.display({ id: "details", header: "Detalhes", cell: ({ row }) => <DetailsLink id={row.original.id} /> }),
]);

export function ItemCategoriesTable({ data, view }: { data: ItemCategory[]; view: TableViewState }) {
	const { navigateToView, ...viewOptions } = useTableView(view, "/inventory/category");

	const table = useTable({
		...viewOptions,
		getRowId: (row) => row.id,
		features,
		columns: columns,
		data: data ?? [],
		autoResetPageIndex: false,
		autoResetSorting: false,
		globalFilterFn: "includesString",
		getColumnCanGlobalFilter: (column) => searchable.has(column.id),
	});

	useTablePageClamp(view, table.getFilteredRowModel().rows.length, navigateToView);

	return (
		<ListViewContext value={view}>
		<div className="space-y-4">
			<TableToolbar table={table} searchLabel="Buscar categoria">
			</TableToolbar>
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((group) => (
						<TableRow key={group.id}>
							{group.headers.map((header) => (
								<TableHead
									key={header.id}
									aria-sort={ariaSort(header.column.getIsSorted())}
								>
									{header.isPlaceholder ? null : (
										<table.FlexRender header={header} />
									)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
						<TableRow key={row.id}>
							{row.getAllCells().map((cell) => (
								<TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>
							))}
						</TableRow>
					)) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								Nenhum registro encontrado.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
			<TablePagination table={table} totalLabel="categoria" />
		</div>
		</ListViewContext>
	);
}
