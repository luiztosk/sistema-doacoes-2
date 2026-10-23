import { compareText } from "@/react-app/lib/text";
import { useTableView, useTablePageClamp } from "@/react-app/components/tables/utils/use-table-view";
import { createContext, useContext } from "react";

import { Link, useNavigate } from "@tanstack/react-router";
import {
	createColumnHelper,
	useTable,
} from "@tanstack/react-table";

import type { DonorList } from "@/schemas/api/donor";
import { formatPhone } from "@/react-app/lib/format";
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
import { UFS } from "@/schemas/api/enums";

const empty = "—";
const emptyRows: DonorList[] = [];
const cityLabel = (row: DonorList) =>
	[row.cidade, row.uf].filter(Boolean).join(" / ");
const searchable = new Set(["name", "cityLabel", "telefone", "email"]);
const columnHelper = createColumnHelper<DataTableFeatures, DonorList>();
const ListViewContext = createContext<TableViewState>({});

function DetailsLink({ id }: { id: string }) {
	const view = useContext(ListViewContext);
	return (
		<Link
			to="/contacts/donors/$id"
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
	columnHelper.accessor(cityLabel, {
		id: "cityLabel",
		header: ({ column }) => <SortableHeader column={column} label="Cidade" />,
		cell: ({ getValue }) => getValue() || empty,
		filterFn: "includesString",
		sortFn: "alphanumeric",
	}),
	columnHelper.accessor((row) => row.phone ?? undefined, {
		id: "telefone",
		header: ({ column }) => <SortableHeader column={column} label="Telefone" />,
		cell: ({ getValue }) => formatPhone(getValue()),
		filterFn: "includesString",
		sortFn: "alphanumeric",
		sortUndefined: "last",
	}),
	columnHelper.accessor((row) => row.email ?? undefined, {
		id: "email",
		header: ({ column }) => <SortableHeader column={column} label="E-mail" />,
		cell: ({ getValue }) => getValue() ?? empty,
		filterFn: "includesString",
		sortFn: "alphanumeric",
		sortUndefined: "last",
	}),
	columnHelper.display({
		id: "details",
		header: "Detalhes",
		cell: ({ row }) => <DetailsLink id={row.id} />,
	}),
	columnHelper.accessor("uf", {
		filterFn: "equalsString",
		enableSorting: false,
	}),
]);

type DonorsTableProps = {
	data: DonorList[];
	view: TableViewState;
};

export function DonorsTable({ data, view }: DonorsTableProps) {
	const navigate = useNavigate();

	const { navigateToView, ...viewOptions } = useTableView(view, "/contacts/donors");

	const table = useTable({
		features,
		columns,
		data: data ?? emptyRows,
		getRowId: (row) => row.id,
		...viewOptions,
		autoResetPageIndex: false,
		autoResetSorting: false,
		globalFilterFn: "includesString",
		getColumnCanGlobalFilter: (column) => searchable.has(column.id),
	});

	useTablePageClamp(view, table.getFilteredRowModel().rows.length, navigateToView);

	const openDonor = (id: string) =>
		navigate({
			to: "/contacts/donors/$id",
			params: { id },
			state: { lista: view },
		});

	const rows = table.getRowModel().rows;

	return (
			<ListViewContext value={view}>
				<div className="space-y-4">
					<TableToolbar table={table} searchLabel="Buscar doador">
						<TableColumnFilter
							table={table}
							columnId="uf"
							label="UF"
							options={UFS.map((value) => ({ value, label: value }))}
						/>
					</TableToolbar>
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((group) => (
								<TableRow key={group.id}>
									{group.headers
										.filter((header) => header.column.id !== "uf")
										.map((header) => (
											<TableHead
												key={header.id}
												aria-sort={ariaSort(header.column.getIsSorted())}
											>
												{header.isPlaceholder ? null : (
													<table.FlexRender header={header} />
												)
											}</TableHead>
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
										onClick={() => openDonor(row.id)}
									>
										{row.getAllCells()
											.filter((cell) => cell.column.id !== "uf")
											.map((cell) => (
												<TableCell key={cell.id}>
													<table.FlexRender cell={cell} />
												</TableCell>
											))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length - 1}
										className="h-24 text-center"
									>
										Nenhum donor encontrado.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
					<TablePagination table={table} totalLabel="donor" />
				</div>
			</ListViewContext>
	);
}
