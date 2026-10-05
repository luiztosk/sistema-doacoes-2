import { createContext, useCallback, useContext, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { createColumnHelper, functionalUpdate, useTable } from "@tanstack/react-table";

import type { Delivery } from "@/react-app/lib/api/deliveries";
import { deliveryOptions } from "@/react-app/lib/api/deliveries";
import type { DataTableFeatures } from "@/react-app/components/tables/table-features";
import { ariaSort, features } from "@/react-app/components/tables/table-features";
import { TablePagination } from "@/react-app/components/tables/table-pagination";
import { SortableHeader } from "@/react-app/components/tables/table-sortable-header";
import { TableToolbar } from "@/react-app/components/tables/table-toolbar";
import type { TableViewState } from "@/react-app/components/tables/table-view-state";
import { paginationFromView, sortingFromView, sortingToView, viewForUrl } from "@/react-app/components/tables/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/react-app/components/ui/table";

const empty = "—";
const emptyRows: Delivery[] = [];
const searchable = new Set(["beneficiaryId", "status", "note"]);

const columnHelper = createColumnHelper<DataTableFeatures, Delivery>();
const ListViewContext = createContext<TableViewState>({});

function DetalhesLink({ id }: { id: string }) {
	const view = useContext(ListViewContext);
	return (
		<Link to="/deliveries/id/$id" params={{ id }} state={{ lista: view }} onClick={(e) => e.stopPropagation()} className={buttonVariants({ variant: "outline", size: "xs" })}>
			Mais detalhes
		</Link>
	);
}

const columns = columnHelper.columns([
	columnHelper.accessor("beneficiaryId", { id: "beneficiaryId", header: ({ column }) => <SortableHeader column={column} label="Beneficiario" />, filterFn: "includesString", sortFn: "alphanumeric" }),
	columnHelper.accessor("status", { id: "status", header: ({ column }) => <SortableHeader column={column} label="Status" />, cell: ({ getValue }) => getValue() === "OPEN" ? "Em aberto" : getValue() === "COMPLETED" ? "Concluida" : getValue() === "CANCELLED" ? "Cancelada" : getValue() || empty, filterFn: "includesString", sortFn: "alphanumeric" }),
	columnHelper.accessor("note", { id: "note", header: ({ column }) => <SortableHeader column={column} label="Observacao" />, cell: ({ getValue }) => getValue() || empty, filterFn: "includesString", sortFn: "alphanumeric", sortUndefined: "last" }),
	columnHelper.display({ id: "details", header: "Detalhes", cell: ({ row }) => <DetalhesLink id={row.id} /> }),
]);

type DeliveriesTableProps = { view: TableViewState };

export function DeliveriesTable({ view }: DeliveriesTableProps) {
	const { data, isPending } = useQuery(deliveryOptions);
	const navigate = useNavigate();

	const irPara = useCallback((next: TableViewState) => navigate({ to: "/deliveries", search: viewForUrl(next), replace: true }), [navigate]);

	const table = useTable({
		features, columns, data: data ?? emptyRows, getRowId: (row) => row.id,
		state: { pagination: paginationFromView(view), sorting: sortingFromView(view.sort) },
		onPaginationChange: (updater) => { const next = functionalUpdate(updater, paginationFromView(view)); irPara({ page: next.pageIndex, pageSize: next.pageSize, sort: view.sort }); },
		onSortingChange: (updater) => { const next = functionalUpdate(updater, sortingFromView(view.sort)); irPara({ page: 0, pageSize: view.pageSize, sort: sortingToView(next) }); },
		autoResetPageIndex: false, autoResetSorting: false, globalFilterFn: "includesString", getColumnCanGlobalFilter: (column) => searchable.has(column.id),
	});

	const { pageIndex, pageSize } = table.state.pagination;
	const total = table.getFilteredRowModel().rows.length;
	useEffect(() => { if (isPending) return; if (pageIndex > 0 && pageIndex * pageSize >= total) irPara({ page: 0, pageSize: view.pageSize, sort: view.sort }); }, [isPending, irPara, pageIndex, pageSize, total, view.pageSize, view.sort]);

	const abrir = (id: string) => navigate({ to: "/deliveries/id/$id", params: { id }, state: { lista: view } });
	const rows = table.getRowModel().rows;

	return (
		<ListViewContext value={view}>
			<div className="space-y-4">
				<TableToolbar table={table} searchLabel="Buscar entrega" />
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((group) => (
							<TableRow key={group.id}>
								{group.headers.map((header) => (
									<TableHead key={header.id} aria-sort={ariaSort(header.column.getIsSorted())}>
										{header.isPlaceholder ? null : <table.FlexRender header={header} />}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{rows.length ? rows.map((row) => (
							<TableRow key={row.id} className="cursor-pointer" onClick={() => abrir(row.id)}>
								{row.getAllCells().map((cell) => (
									<TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>
								))}
							</TableRow>
						)) : (
							<TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Nenhuma entrega encontrada.</TableCell></TableRow>
						)}
					</TableBody>
				</Table>
				<TablePagination table={table} totalLabel="entrega" />
			</div>
		</ListViewContext>
	);
}
