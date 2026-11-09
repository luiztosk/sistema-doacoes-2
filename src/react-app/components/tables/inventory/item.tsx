import { compareText } from "@/react-app/lib/text";
import { useTableView, useTablePageClamp } from "@/react-app/components/tables/utils/use-table-view";
import { createContext, useContext } from "react";
import { Link } from "@tanstack/react-router";
import {
	createColumnHelper,
	useTable,
} from "@tanstack/react-table";

import type { InventoryItem } from "@/schemas/api/item";
import type { ItemCategory } from "@/schemas/api/category";
import type { DataTableFeatures } from "@/react-app/components/tables/utils/table-features";
import { ariaSort, features } from "@/react-app/components/tables/utils/table-features";
import { TablePagination } from "@/react-app/components/tables/utils/table-pagination";
import { SortableHeader } from "@/react-app/components/tables/utils/table-sortable-header";
import {
	TableColumnFilter,
	TableToolbar,
} from "@/react-app/components/tables/utils/table-toolbar";
import type { TableViewState } from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/react-app/components/ui/table";
import { UNITS } from "@/schemas/api/enums";

const empty = "—";

const searchable = new Set(["name", "categoryId", "unit"]);

const unitOptions = UNITS.map((value) => ({
	value,
	label:
		value === "KG" ? "Quilograma" :
			value === "L" ? "Litro" :
				value === "UNIT" ? "Unidade" :
					value === "PACK" ? "Pacote" :
						"Caixa",
}));

const columnHelper = createColumnHelper<DataTableFeatures, InventoryItem & { categoryName: string }>();
const ListViewContext = createContext<TableViewState>({});

function DetalhesLink({ id }: { id: string }) {
	const view = useContext(ListViewContext);

	return (
		<Link
			to="/inventory/item/$id"
			params={{ id }}
			state={{ lista: view }}
			onClick={(event) => event.stopPropagation()}
			className={buttonVariants({ variant: "outline", size: "xs" })}
		>
			Mais detalhes
		</Link>
	);
}

const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		header: ({ column }) => <SortableHeader column={column} label="Nome" />,
		filterFn: "includesString",
		sortFn: (left, right, columnId) => compareText(left.getValue(columnId), right.getValue(columnId)),
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
		cell: ({ getValue }) => {
			const value = getValue();
			return value == null ? empty : value;
		},
		filterFn: "equalsString",
		sortFn: "alphanumeric",
		sortUndefined: "last",
	}),
	columnHelper.accessor((row) => row.onHand ?? undefined, {
		id: "onHand",
		header: ({ column }) => (
			<SortableHeader column={column} label="Em estoque" />
		),
		cell: ({ getValue }) => {
			const value = getValue();
			return value == null ? empty : String(value);
		},
		filterFn: "includesString",
		sortFn: "basic",
		sortUndefined: "last",
	}),
	columnHelper.accessor((row) => row.reserved ?? undefined, {
		id: "reserved",
		header: ({ column }) => (
			<SortableHeader column={column} label="Reservado" />
		),
		cell: ({ getValue }) => {
			const value = getValue();
			return value == null ? empty : String(value);
		},
		filterFn: "includesString",
		sortFn: "basic",
		sortUndefined: "last",
	}),
	columnHelper.accessor((row) => row.available ?? undefined, {
		id: "available",
		header: ({ column }) => (
			<SortableHeader column={column} label="Disponível" />
		),
		cell: ({ getValue }) => {
			const value = getValue();
			return value == null ? empty : String(value);
		},
		filterFn: "includesString",
		sortFn: "basic",
		sortUndefined: "last",
	}),
	columnHelper.display({
		id: "details",
		header: "Detalhes",
		cell: ({ row }) => <DetalhesLink id={row.original.id} />,
	}),
]);

export function ItemsTable({ items, categories, view }: { items: InventoryItem[]; categories: ItemCategory[]; view: TableViewState }) {
	const data = items.map((item) => ({
		...item,
		categoryName: categories.find(a => a.id === item.categoryId)?.name ?? ""
	})
	)

	const { navigateToView, ...viewOptions } = useTableView(view, "/inventory/item");

	const table = useTable({
		...viewOptions,
		getRowId: (row) => row.id,
		features,
		columns: columns,
		data: data,
		autoResetPageIndex: false,
		autoResetSorting: false,
		globalFilterFn: "includesString",
		getColumnCanGlobalFilter: (column) => searchable.has(column.id),
	});

	useTablePageClamp(view, table.getFilteredRowModel().rows.length, navigateToView);

	return (
		<ListViewContext value={view}>
		<div className="space-y-4">
			<TableToolbar table={table} searchLabel="Buscar item de estoque">
				<TableColumnFilter
					table={table}
					columnId="unit"
					label="Unidade"
					options={unitOptions}
				/>
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
			<TablePagination table={table} totalLabel="item" />
		</div>
		</ListViewContext>
	);
}
