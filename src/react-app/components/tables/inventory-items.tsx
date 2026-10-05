import { createContext, useCallback, useContext, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	createColumnHelper,
	functionalUpdate,
	useTable,
} from "@tanstack/react-table";

import type { InventoryItem } from "@/react-app/lib/api/inventory-items";
import { inventoryItemOptions } from "@/react-app/lib/api/inventory-items";
import type { DataTableFeatures } from "@/react-app/components/tables/table-features";
import { ariaSort, features } from "@/react-app/components/tables/table-features";
import { TablePagination } from "@/react-app/components/tables/table-pagination";
import { SortableHeader } from "@/react-app/components/tables/table-sortable-header";
import {
	TableColumnFilter,
	TableToolbar,
} from "@/react-app/components/tables/table-toolbar";
import type { TableViewState } from "@/react-app/components/tables/table-view-state";
import {
	paginationFromView,
	sortingFromView,
	sortingToView,
	viewForUrl,
} from "@/react-app/components/tables/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/react-app/components/ui/table";
import { UNITS } from "@/worker/db/schema";

const empty = "—";

const emptyRows: InventoryItem[] = [];

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

const columnHelper = createColumnHelper<DataTableFeatures, InventoryItem>();
const ListViewContext = createContext<TableViewState>({});

function DetalhesLink({ id }: { id: string }) {
	const view = useContext(ListViewContext);

	return (
		<Link
			to="/inventory-items/id/$id"
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
	columnHelper.accessor("categoryId", {
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

type InventoryItemsTableProps = {
	view: TableViewState;
};

export function InventoryItemsTable({ view }: InventoryItemsTableProps) {
	const { data, isPending } = useQuery(inventoryItemOptions);
	const navigate = useNavigate();

	const irPara = useCallback(
		(next: TableViewState) =>
			navigate({
				to: "/inventory-items",
				search: viewForUrl(next),
				replace: true,
			}),
		[navigate],
	);

	const table = useTable({
		features,
		columns,
		data: data ?? emptyRows,
		getRowId: (row) => row.id,
		state: {
			pagination: paginationFromView(view),
			sorting: sortingFromView(view.sort),
		},
		onPaginationChange: (updater) => {
			const next = functionalUpdate(updater, paginationFromView(view));
			irPara({
				page: next.pageIndex,
				pageSize: next.pageSize,
				sort: view.sort,
			});
		},
		onSortingChange: (updater) => {
			const next = functionalUpdate(updater, sortingFromView(view.sort));
			irPara({
				page: 0,
				pageSize: view.pageSize,
				sort: sortingToView(next),
			});
		},
		autoResetPageIndex: false,
		autoResetSorting: false,
		globalFilterFn: "includesString",
		getColumnCanGlobalFilter: (column) => searchable.has(column.id),
	});

	const { pageIndex, pageSize } = table.state.pagination;
	const total = table.getFilteredRowModel().rows.length;

	useEffect(() => {
		if (isPending) {
			return;
		}
		if (pageIndex > 0 && pageIndex * pageSize >= total) {
			irPara({ page: 0, pageSize: view.pageSize, sort: view.sort });
		}
	}, [isPending, irPara, pageIndex, pageSize, total, view.pageSize, view.sort]);

	const abrir = (id: string) =>
		navigate({
			to: "/inventory-items/id/$id",
			params: { id },
			state: { lista: view },
		});

	const rows = table.getRowModel().rows;

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
						{rows.length ? (
							rows.map((row) => (
								<TableRow
									key={row.id}
									className="cursor-pointer"
									onClick={() => abrir(row.id)}
								>
									{row.getAllCells().map((cell) => (
										<TableCell key={cell.id}>
											<table.FlexRender cell={cell} />
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									Nenhum item encontrado.
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
