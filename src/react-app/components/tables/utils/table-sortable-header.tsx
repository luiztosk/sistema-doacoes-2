import {
	ArrowDown01Icon,
	ArrowUp01Icon,
	Sorting01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Column, RowData } from "@tanstack/react-table";

import type { DataTableFeatures } from "@/react-app/components/tables/utils/table-features";
import { Button } from "@/react-app/components/ui/button";

type SortableHeaderProps<TData extends RowData, TValue> = {
	column: Column<DataTableFeatures, TData, TValue>;
	label: string;
};

export function SortableHeader<TData extends RowData, TValue>({
	column,
	label,
}: SortableHeaderProps<TData, TValue>) {
	const sorted = column.getIsSorted();

	const icon =
		sorted === "asc"
			? ArrowUp01Icon
			: sorted === "desc"
				? ArrowDown01Icon
				: Sorting01Icon;

	return (
		<Button
			variant="ghost"
			size="sm"
			className="-mx-3"
			onClick={() => column.toggleSorting()}
		>
			{label}
			<HugeiconsIcon icon={icon} className="size-4 shrink-0" />
		</Button>
	);
}
