import { createContext, useContext } from "react";
import { Link } from "@tanstack/react-router";
import {
	createColumnHelper,
	useTable,
} from "@tanstack/react-table";

import type { InventoryItemTableView, ItemCategorySelect } from "@/schemas/zod/inventory";
import { inventoryItemsQuery } from "@/react-app/lib/queries/inventory/items";
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
import { UNITS } from "@/schemas/db/inventory";

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

const columnHelper = createColumnHelper<DataTableFeatures, InventoryItemTableView>();
const ListViewContext = createContext<TableViewState>({});

function DetalhesLink({ id }: { id: string }) {
	const view = useContext(ListViewContext);

	return (
		<Link
			to="/inventory/items/id/$id"
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
		sortFn: "alphanumeric",
	}),
	columnHelper.accessor((row) => row.categoryId, {
		id: "categoryId",
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
	columnHelper.accessor((row) => row.reservedQuantity ?? undefined, {
		id: "reservedQuantity",
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
		cell: ({ row }) => <DetalhesLink id={row.id} />,
	}),
]);

export function InventoryItemsTable({items, categories}: { items: InventoryItemTableView[], categories: ItemCategorySelect[] }) {
	// const { data: queryData } = inventoryItemsQuery();
	// items.forEach((item) => item.categoryId = categories.filter((a) => a.id == item.categoryId)[0].name)
	items.forEach((item) => {
		try {
			item.categoryId = categories.filter((a) => a.id === item.categoryId)[0].name
		}
		catch {
		}
	})


	const table = useTable({
		features,
		columns: columns,
		// data: data ?? queryData ?? [],
		data: items,
		autoResetPageIndex: false,
		autoResetSorting: false,
		globalFilterFn: "includesString",
		getColumnCanGlobalFilter: (column) => searchable.has(column.id),
	});

	return (
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
			<TablePagination table={table} totalLabel="item" />
		</div>
	);
}