import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { createColumnHelper, useTable } from "@tanstack/react-table";

import type { Assistido } from "@/react-app/lib/api/assistidos";
import { assistidoOptions } from "@/react-app/lib/api/assistidos";
import type { DataTableFeatures } from "@/react-app/components/tables/table-features";
import { ariaSort, features } from "@/react-app/components/tables/table-features";
import { TablePagination } from "@/react-app/components/tables/table-pagination";
import { SortableHeader } from "@/react-app/components/tables/table-sortable-header";
import {
	TableColumnFilter,
	TableToolbar,
} from "@/react-app/components/tables/table-toolbar";
import { Button } from "@/react-app/components/ui/button";
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
	columnHelper.accessor("telefone", {
		header: ({ column }) => <SortableHeader column={column} label="Telefone" />,
		cell: ({ getValue }) => getValue() ?? empty,
		filterFn: "includesString",
		sortFn: "alphanumeric",
	}),
	columnHelper.accessor("email", {
		header: ({ column }) => <SortableHeader column={column} label="E-mail" />,
		cell: ({ getValue }) => getValue() ?? empty,
		filterFn: "includesString",
		sortFn: "alphanumeric",
	}),
	columnHelper.accessor("renda", {
		header: ({ column }) => <SortableHeader column={column} label="Renda" />,
		cell: ({ getValue }) => {
			const value = getValue();
			return value == null ? empty : `R$ ${value.toFixed(2)}`;
		},
		sortFn: "basic",
		sortUndefined: "last",
	}),
	columnHelper.accessor("tipoImovel", {
		header: ({ column }) => <SortableHeader column={column} label="Tipo de imóvel" />,
		cell: ({ getValue }) => getValue() ?? empty,
		filterFn: "equalsString",
		sortFn: "alphanumeric",
		sortUndefined: "last",
	}),
	columnHelper.accessor("cestaBasica", {
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
		cell: ({ row }) => (
			<Button
				size="xs"
				variant="outline"
				nativeButton={false}
				onClick={(event) => event.stopPropagation()}
				render={
					<Link
						to="/assistidos/$id"
						params={{ id: row.id }}
						onClick={(event) => event.stopPropagation()}
					/>
				}
			>
				Mais detalhes
			</Button>
		),
	}),
]);

export function AssistidosTable() {
	const { data } = useQuery(assistidoOptions);
	const navigate = useNavigate();

	const table = useTable({
		features,
		columns,
		data: data ?? emptyRows,
		getRowId: (row) => row.id,
		initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
		autoResetPageIndex: false,
		autoResetSorting: false,
		globalFilterFn: "includesString",
		getColumnCanGlobalFilter: (column) => searchable.has(column.id),
	});

	const rows = table.getRowModel().rows;

	return (
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
								onClick={() =>
									navigate({ to: "/assistidos/$id", params: { id: row.id } })
								}
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
	);
}
