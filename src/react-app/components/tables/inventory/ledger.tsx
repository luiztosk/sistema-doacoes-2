import {
	createColumnHelper,
	useTable,
} from "@tanstack/react-table";

import type { LedgerEntry } from "@/schemas/api/ledger";
import { compareDates, formatDate } from "@/react-app/lib/format";
import type { DataTableFeatures } from "@/react-app/components/tables/utils/table-features";
import { features } from "@/react-app/components/tables/utils/table-features";
import { ServerPagination } from "@/react-app/components/tables/utils/server-pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/react-app/components/ui/table";

const empty = "—";

const ledgerKindLabels: Record<string, string> = {
	RECEIVE: "Recebimento",
	RESERVE: "Reserva",
	ISSUE: "Baixa",
	RELEASE: "Liberação",
	ADJUST: "Ajuste",
	COUNT: "Contagem",
	REVERSE: "Estorno",
};

const columnHelper = createColumnHelper<DataTableFeatures, LedgerEntry>();

const delta = (value: number) =>
	value === 0 ? empty : value > 0 ? `+${value}` : `${value}`;

const columns = columnHelper.columns([
	columnHelper.accessor("seq", {
		id: "seq",
		header: "Nº",
		sortFn: "basic",
	}),
	columnHelper.accessor((row) => ledgerKindLabels[row.kind] ?? row.kind, {
		id: "kind",
		header: "Movimento",
		filterFn: "includesString",
		sortFn: "alphanumeric",
	}),
	columnHelper.accessor("itemName", {
		id: "itemName",
		header: "Item",
		filterFn: "includesString",
		sortFn: "alphanumeric",
	}),
	columnHelper.accessor((row) => row.onHandDelta, {
		id: "onHandDelta",
		header: "Físico",
		cell: ({ getValue }) => delta(getValue()),
		sortFn: "basic",
	}),
	columnHelper.accessor((row) => row.reservedDelta, {
		id: "reservedDelta",
		header: "Reserva",
		cell: ({ getValue }) => delta(getValue()),
		sortFn: "basic",
	}),
	columnHelper.accessor((row) => row.countedQuantity ?? undefined, {
		id: "countedQuantity",
		header: "Contado",
		cell: ({ getValue }) => getValue() ?? empty,
		sortFn: "basic",
		sortUndefined: "last",
	}),
	columnHelper.accessor("occurredAt", {
		id: "occurredAt",
		header: "Quando",
		cell: ({ getValue }) => formatDate(getValue()),
		sortFn: (left, right, columnId) =>
			compareDates(left.getValue(columnId), right.getValue(columnId)),
	}),
]);

type LedgerTableProps = {
	entries: LedgerEntry[];
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
};

export function LedgerTable({
	entries,
	page,
	pageSize,
	total,
	onPageChange,
	onPageSizeChange,
}: LedgerTableProps) {
	const table = useTable({
		features,
		columns,
		data: entries,
		autoResetPageIndex: false,
		autoResetSorting: false,
		globalFilterFn: "includesString",
	});

	return (
		<div className="space-y-4">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((group) => (
						<TableRow key={group.id}>
							{group.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder ? null : (
										<table.FlexRender header={header} />
									)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow key={row.id}>
								{row.getAllCells().map((cell) => (
									<TableCell key={cell.id}>
										<table.FlexRender cell={cell} />
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={7} className="text-muted-foreground">
								Nenhum movimento registrado.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
			<ServerPagination
				page={page}
				pageSize={pageSize}
				total={total}
				totalLabel="movimento"
				onPageChange={onPageChange}
				onPageSizeChange={onPageSizeChange}
			/>
		</div>
	);
}
