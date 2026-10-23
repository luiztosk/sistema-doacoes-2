import { compareDates, formatDate } from "@/react-app/lib/format";
import { useTableView, useTablePageClamp } from "@/react-app/components/tables/utils/use-table-view";
import { createContext, useContext } from "react";

import { Link, useNavigate } from "@tanstack/react-router";
import {
	createColumnHelper,
	useTable,
} from "@tanstack/react-table";

import type { DonationList } from "@/schemas/api/donation";
import type { DonorList } from "@/schemas/api/donor";
import type { DataTableFeatures } from "@/react-app/components/tables/utils/table-features";
import { ariaSort, features } from "@/react-app/components/tables/utils/table-features";
import { TablePagination } from "@/react-app/components/tables/utils/table-pagination";
import { SortableHeader } from "@/react-app/components/tables/utils/table-sortable-header";
import { TableToolbar } from "@/react-app/components/tables/utils/table-toolbar";
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

const empty = "—";
const emptyRows: DonationList[] = [];

const searchable = new Set(["donorId", "status", "note"]);

const columnHelper = createColumnHelper<
	DataTableFeatures,
	DonationList & { donorName: string }
>();
const ListViewContext = createContext<TableViewState>({});

function DetalhesLink({ id }: { id: string }) {
	const view = useContext(ListViewContext);
	return (
		<Link
			to="/inventory/donations/$id"
			params={{ id }}
			state={{ lista: view }}
			onClick={(e) => e.stopPropagation()}
			className={buttonVariants({ variant: "outline", size: "xs" })}
		>
			Mais detalhes
		</Link>
	);
}

const columns = columnHelper.columns([
	columnHelper.accessor("occurredAt", {
		header: ({ column }) => <SortableHeader column={column} label="Data" />,
		cell: ({ getValue }) => formatDate(getValue()),
		sortFn: (left, right, columnId) => compareDates(left.getValue(columnId), right.getValue(columnId)),
	}),
	columnHelper.accessor((row) => row.donorName, {
		id: "donorId",
		header: ({ column }) => <SortableHeader column={column} label="Doador" />,
		filterFn: "includesString",
		sortFn: "alphanumeric",
	}),
	columnHelper.accessor("status", {
		id: "status",
		header: ({ column }) => <SortableHeader column={column} label="Status" />,
		cell: ({ getValue }) =>
			getValue() === "RECEIVED" ? "Recebida" : getValue() === "VOID" ? "Estornada" : getValue() || empty,
		filterFn: "includesString",
		sortFn: "alphanumeric",
	}),
	columnHelper.accessor("note", {
		id: "note",
		header: ({ column }) => <SortableHeader column={column} label="Observação" />,
		cell: ({ getValue }) => getValue() || empty,
		filterFn: "includesString",
		sortFn: "alphanumeric",
		sortUndefined: "last",
	}),
	columnHelper.display({
		id: "details",
		header: "Detalhes",
		cell: ({ row }) => <DetalhesLink id={row.id} />,
	}),
]);

type DonationsTableProps = {
	data: DonationList[];
	donors: DonorList[];
	view: TableViewState;
};

export function DonationsTable({ data, donors, view }: DonationsTableProps) {
	const enriched = data.map((row) => ({
		...row,
		donorName: donors.find((donor) => donor.id === row.donorId)?.name ?? row.donorId,
	}));
	const navigate = useNavigate();

	const { navigateToView, ...viewOptions } = useTableView(view, "/inventory/donations");

	const table = useTable({
		features,
		columns,
		data: enriched ?? emptyRows,
		getRowId: (row) => row.id,
		...viewOptions,
		autoResetPageIndex: false,
		autoResetSorting: false,
		globalFilterFn: "includesString",
		getColumnCanGlobalFilter: (column) => searchable.has(column.id),
	});

	useTablePageClamp(view, table.getFilteredRowModel().rows.length, navigateToView);

	const abrir = (id: string) =>
		navigate({ to: "/inventory/donations/$id", params: { id }, state: { lista: view } });

	const rows = table.getRowModel().rows;

	return (
		<ListViewContext value={view}>
			<div className="space-y-4">
				<TableToolbar table={table} searchLabel="Buscar doação" />
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
						{rows.length ? (
							rows.map((row) => (
								<TableRow key={row.id} className="cursor-pointer" onClick={() => abrir(row.id)}>
									{row.getAllCells().map((cell) => (
										<TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									Nenhuma doacao encontrada.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
				<TablePagination table={table} totalLabel="doacao" />
			</div>
		</ListViewContext>
	);
}
