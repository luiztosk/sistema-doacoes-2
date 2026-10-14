import { createColumnHelper, useTable } from "@tanstack/react-table";

import type { ItemCategorySelect } from "@/schemas/zod/inventory";
import { itemCategoriesQuery } from "@/react-app/lib/queries/inventory/categories";
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

const columnHelper = createColumnHelper<DataTableFeatures, ItemCategorySelect>();

const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		header: ({ column }) => <SortableHeader column={column} label="Name" />,
		filterFn: "includesString",
		sortFn: "alphanumeric",
	}),
]);

export function ItemCategoriesTable({ data }: { data: ItemCategorySelect[] }) {
	const { data: queryData } = itemCategoriesQuery();

	const table = useTable({
		features,
		columns: columns,
		data: data ?? queryData ?? [],
		autoResetPageIndex: false,
		autoResetSorting: false,
		globalFilterFn: "includesString",
		getColumnCanGlobalFilter: (column) => searchable.has(column.id),
	});

	return (
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
					{table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
							>
								{row.getAllCells().map((cell) => (
									<TableCell key={cell.id}>
										<table.FlexRender cell={cell} />
									</TableCell>
								))}
							</TableRow>
						))
					}
				</TableBody>
			</Table>
			<TablePagination table={table} totalLabel="categoria" />
		</div>
	);
}