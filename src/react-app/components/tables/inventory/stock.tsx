import {
	createColumnHelper,
	useTable,
} from "@tanstack/react-table";

import type { Stock } from "@/schemas/api/stock";
import type { DataTableFeatures } from "@/react-app/components/tables/utils/table-features";
import { ariaSort, features } from "@/react-app/components/tables/utils/table-features";
import { TablePagination } from "@/react-app/components/tables/utils/table-pagination";
import { SortableHeader } from "@/react-app/components/tables/utils/table-sortable-header";
import { TableToolbar } from "@/react-app/components/tables/utils/table-toolbar";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/react-app/components/ui/table";

const empty = "—";

const searchable = new Set(["name", "categoryName", "unit"]);

const columnHelper = createColumnHelper<DataTableFeatures, Stock>();

export function StockTable({ stock }: { stock: Stock[] }) {
	const table = useTable({
		features,
		columns,
		data: stock,
		autoResetPageIndex: false,
		autoResetSorting: false,
		globalFilterFn: "includesString",
		getColumnCanGlobalFilter: (column) => searchable.has(column.id),
	});

	return (
		<div className="space-y-4">
				<TableToolbar table={table} searchLabel="Buscar item" />
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
							<TableRow key={row.id}>
								{row.getAllCells().map((cell) => (
									<TableCell key={cell.id}>
										<table.FlexRender cell={cell} />
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
				<TablePagination table={table} totalLabel="item" />
		</div>
	);
}

const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		header: ({ column }) => <SortableHeader column={column} label="Nome" />,
		filterFn: "includesString",
		sortFn: "alphanumeric",
	}),
	columnHelper.accessor((row) => row.categoryName, {
		id: "categoryName",
		header: ({ column }) => (
			<SortableHeader column={column} label="Categoria" />
		),
		cell: ({ getValue }) => getValue() || empty,
		filterFn: "includesString",
		sortFn: "alphanumeric",
		sortUndefined: "last",
	}),
	columnHelper.accessor((row) => row.unit, {
		id: "unit",
		header: ({ column }) => <SortableHeader column={column} label="Unidade" />,
		cell: ({ getValue }) => getValue() || empty,
		filterFn: "equalsString",
		sortFn: "alphanumeric",
		sortUndefined: "last",
	}),
	columnHelper.accessor((row) => row.onHand, {
		id: "onHand",
		header: ({ column }) => (
			<SortableHeader column={column} label="Em estoque" />
		),
		cell: ({ getValue }) => String(getValue()),
		filterFn: "includesString",
		sortFn: "basic",
		sortUndefined: "last",
	}),
	columnHelper.accessor((row) => row.reserved, {
		id: "reserved",
		header: ({ column }) => (
			<SortableHeader column={column} label="Reservado" />
		),
		cell: ({ getValue }) => String(getValue()),
		filterFn: "includesString",
		sortFn: "basic",
		sortUndefined: "last",
	}),
	columnHelper.accessor((row) => row.available, {
		id: "available",
		header: ({ column }) => (
			<SortableHeader column={column} label="Disponível" />
		),
		cell: ({ getValue }) => String(getValue()),
		filterFn: "includesString",
		sortFn: "basic",
		sortUndefined: "last",
	}),
]);
