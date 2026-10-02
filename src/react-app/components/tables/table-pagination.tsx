import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactTable, RowData } from "@tanstack/react-table";

import type { DataTableFeatures } from "@/react-app/components/tables/table-features";
import { Button } from "@/react-app/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/react-app/components/ui/select";

type TablePaginationProps<TData extends RowData> = {
	table: ReactTable<DataTableFeatures, TData>;
	totalLabel: string;
	pageSizes?: readonly number[];
};

export function TablePagination<TData extends RowData>({
	table,
	totalLabel,
	pageSizes = [10, 20, 50, 100],
}: TablePaginationProps<TData>) {
	const { pageIndex, pageSize } = table.state.pagination;
	const total = table.getFilteredRowModel().rows.length;
	const first = total === 0 ? 0 : pageIndex * pageSize + 1;
	const last = Math.min(total, (pageIndex + 1) * pageSize);

	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<p className="text-sm text-muted-foreground">
				{first === 0 ? `Nenhum ${totalLabel}` : `${first}–${last} de ${total}`}
			</p>
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					<label
						htmlFor="table-page-size"
						className="text-sm text-muted-foreground"
					>
						Linhas por página
					</label>
					<Select
						value={`${pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
							table.setPageIndex(0);
						}}
					>
						<SelectTrigger id="table-page-size" className="w-20">
							<SelectValue placeholder={`${pageSize}`} />
						</SelectTrigger>
						<SelectContent>
							{pageSizes.map((size) => (
								<SelectItem key={size} value={`${size}`}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<p className="text-sm font-medium">
					Página {table.getPageCount() === 0 ? 0 : pageIndex + 1} de{" "}
					{table.getPageCount()}
				</p>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon-sm"
						aria-label="Página anterior"
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
					>
						<HugeiconsIcon icon={ArrowLeft01Icon} className="size-4 shrink-0" />
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						aria-label="Próxima página"
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
					>
						<HugeiconsIcon icon={ArrowRight01Icon} className="size-4 shrink-0" />
					</Button>
				</div>
			</div>
		</div>
	);
}
