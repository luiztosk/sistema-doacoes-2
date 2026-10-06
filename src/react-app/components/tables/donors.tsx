import { createContext, useCallback, useContext, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	createColumnHelper,
	functionalUpdate,
	useTable,
} from "@tanstack/react-table";

import type { DonorTableView } from "@/schemas/zod/contacts";
import { donorOptions } from "@/react-app/lib/api/donors";
import type { DataTableFeatures } from "@/react-app/components/tables/utils/table-features";
import { ariaSort, features } from "@/react-app/components/tables/utils/table-features";
import { TablePagination } from "@/react-app/components/tables/utils/table-pagination";
import { SortableHeader } from "@/react-app/components/tables/utils/table-sortable-header";
import {
  TableColumnFilter,
  TableToolbar,
} from "@/react-app/components/tables/utils/table-toolbar";
import type { TableViewState } from "@/react-app/components/tables/utils/table-view-state";
import {
  paginationFromView,
  sortingFromView,
  sortingToView,
  viewForUrl,
} from "@/react-app/components/tables/utils/table-view-state";
import { buttonVariants } from "@/react-app/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/react-app/components/ui/table";
import { UFS } from "@/schemas/db/contacts";

const empty = "—";
const emptyRows: DonorTableView[] = [];
const cityLabel = (row: DonorTableView) =>
	[row.cidade, row.uf].filter(Boolean).join(" / ");
const searchable = new Set(["nome", "cityLabel", "telefone", "email"]);
const columnHelper = createColumnHelper<DataTableFeatures, DonorTableView>();
const ListViewContext = createContext<TableViewState>({});

function DetailsLink({ id }: { id: string }) {
	const view = useContext(ListViewContext);
	return (
		<Link
			to="/donors/id/$id"
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
		cell: ({ getValue }) => getValue() ?? empty,
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
	view: TableViewState;
};

export function DonorsTable({ view }: DonorsTableProps) {
	const { data, isPending, isError } = useQuery(donorOptions);
	const navigate = useNavigate();

	const navigateToView = useCallback(
		(next: TableViewState) =>
			navigate({ to: "/donors", search: viewForUrl(next), replace: true }),
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
			navigateToView({
				page: next.pageIndex,
				pageSize: next.pageSize,
				sort: view.sort,
			});
		},
		onSortingChange: (updater) => {
			const next = functionalUpdate(updater, sortingFromView(view.sort));
			navigateToView({
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
			navigateToView({ page: 0, pageSize: view.pageSize, sort: view.sort });
		}
	}, [
		isPending,
		navigateToView,
		pageIndex,
		pageSize,
		total,
		view.pageSize,
		view.sort,
	]);

	const openDonor = (id: string) =>
		navigate({
			to: "/donors/id/$id",
			params: { id },
			state: { lista: view },
		});

	const rows = table.getRowModel().rows;

	if (isError) {
		return <p>Não foi possível carregar os doadores.</p>;
	}

	return (
			<ListViewContext value={view}>
				<div className="space-y-4">
					<TableToolbar table={table} searchLabel="Buscar donor">
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
										{isPending
											? "Carregando donors..."
											: "Nenhum donor encontrado."}
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
