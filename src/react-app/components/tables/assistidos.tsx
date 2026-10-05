import { createContext, useCallback, useContext, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	createColumnHelper,
	functionalUpdate,
	useTable,
} from "@tanstack/react-table";

import type { Assistido } from "@/react-app/lib/api/assistidos";
import { assistidoOptions } from "@/react-app/lib/api/assistidos";
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
import { TIPOS_IMOVEL } from "@/worker/db/schema";

const empty = "—";

const emptyRows: Assistido[] = [];

const cityLabel = (row: Assistido) =>
	[row.cidade, row.uf].filter(Boolean).join(" / ");

const searchable = new Set([
	"nome",
	"cityLabel",
	"telefone",
	"email",
	"tipoImovel",
]);

const tipoImovelOptions = TIPOS_IMOVEL.map((value) => ({
	value,
	label: value === "ALUGADO" ? "Alugado" : "Próprio",
}));

const cestaBasicaOptions = [
	{ value: "true", label: "Sim" },
	{ value: "false", label: "Não" },
];

const columnHelper = createColumnHelper<DataTableFeatures, Assistido>();
const ListViewContext = createContext<TableViewState>({});

function DetalhesLink({ id }: { id: string }) {
	const view = useContext(ListViewContext);

	return (
		<Link
			to="/assistidos/id/$id"
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
	columnHelper.accessor("nome", {
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
	columnHelper.accessor((row) => row.telefone ?? undefined, {
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
	columnHelper.accessor((row) => row.renda ?? undefined, {
		id: "renda",
		header: ({ column }) => <SortableHeader column={column} label="Renda" />,
		cell: ({ getValue }) => {
			const value = getValue();
			return value == null ? empty : `R$ ${value.toFixed(2)}`;
		},
		sortFn: "basic",
		sortUndefined: "last",
	}),
	columnHelper.accessor((row) => row.tipoImovel ?? undefined, {
		id: "tipoImovel",
		header: ({ column }) => <SortableHeader column={column} label="Tipo de imóvel" />,
		cell: ({ getValue }) => getValue() ?? empty,
		filterFn: "equalsString",
		sortFn: "alphanumeric",
		sortUndefined: "last",
	}),
	columnHelper.accessor((row) => row.cestaBasica ?? undefined, {
		id: "cestaBasica",
		header: ({ column }) => (
			<SortableHeader column={column} label="Cesta básica" />
		),
		cell: ({ getValue }) => {
			const value = getValue();
			return value == null ? empty : value ? "Sim" : "Não";
		},
		filterFn: "equalsString",
		sortFn: "basic",
		sortUndefined: "last",
	}),
	columnHelper.display({
		id: "details",
		header: "Detalhes",
		cell: ({ row }) => <DetalhesLink id={row.id} />,
	}),
]);

type AssistidosTableProps = {
	view: TableViewState;
};

export function AssistidosTable({ view }: AssistidosTableProps) {
	const { data, isPending } = useQuery(assistidoOptions);
	const navigate = useNavigate();

	const irPara = useCallback(
		(next: TableViewState) =>
			navigate({ to: "/assistidos", search: viewForUrl(next), replace: true }),
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
			to: "/assistidos/id/$id",
			params: { id },
			state: { lista: view },
		});

	const rows = table.getRowModel().rows;

	return (
		<ListViewContext value={view}>
			<div className="space-y-4">
				<TableToolbar table={table} searchLabel="Buscar assistido">
					<TableColumnFilter
						table={table}
						columnId="tipoImovel"
						label="Tipo de imóvel"
						options={tipoImovelOptions}
					/>
					<TableColumnFilter
						table={table}
						columnId="cestaBasica"
						label="Cesta básica"
						options={cestaBasicaOptions}
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
								<TableCell colSpan={columns.length} className="h-24 text-center">
									Nenhum assistido encontrado.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
				<TablePagination table={table} totalLabel="assistido" />
			</div>
		</ListViewContext>
	);
}
