import { compareText } from "@/react-app/lib/text";
import { useTableView, useTablePageClamp } from "@/react-app/components/tables/utils/use-table-view";
import { createContext, useContext } from "react";
import { Link } from "@tanstack/react-router";
import {
	createColumnHelper,
	useTable,
} from "@tanstack/react-table";

import type { BeneficiaryList } from "@/schemas/api/beneficiary";
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
import { TIPOS_IMOVEL } from "@/schemas/api/enums";

const empty = "—";

const cityLabel = (row: BeneficiaryList) =>
	[row.cidade, row.uf].filter(Boolean).join(" / ");

const searchable = new Set([
	"name",
	"cityLabel",
	"phone",
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

const columnHelper = createColumnHelper<DataTableFeatures, BeneficiaryList>();
const ListViewContext = createContext<TableViewState>({});

function DetalhesLink({ id }: { id: string }) {
	const view = useContext(ListViewContext);

	return (
		<Link
			to="/contacts/beneficiaries/$id"
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
		id: "phone",
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
		cell: ({ row }) => <DetalhesLink id={row.original.id} />,
	}),
]);

export function BeneficiariesTable({ beneficiaries, view }: { beneficiaries: BeneficiaryList[]; view: TableViewState }) {
	const data = beneficiaries;

	const { navigateToView, ...viewOptions } = useTableView(view, "/contacts/beneficiaries");

	const table = useTable({
		...viewOptions,
		getRowId: (row) => row.id,
		features,
		columns,
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
			<TableToolbar table={table} searchLabel="Buscar beneficiário">
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
			<TablePagination table={table} totalLabel="beneficiário" />
		</div>
		</ListViewContext>
	);
}
