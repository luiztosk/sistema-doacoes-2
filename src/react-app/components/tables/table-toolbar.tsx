import type { ReactNode } from "react";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactTable, RowData } from "@tanstack/react-table";

import type { SelectOption } from "@/react-app/components/forms/fields";
import type { DataTableFeatures } from "@/react-app/components/tables/table-features";
import {
	InputGroup,
	InputGroupInput,
	InputGroupText,
} from "@/react-app/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/react-app/components/ui/select";

type TableToolbarProps<TData extends RowData> = {
	table: ReactTable<DataTableFeatures, TData>;
	searchLabel: string;
	children?: ReactNode;
};

export function TableToolbar<TData extends RowData>({
	table,
	searchLabel,
	children,
}: TableToolbarProps<TData>) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<InputGroup className="w-full sm:max-w-xs">
				<InputGroupText>
					<HugeiconsIcon icon={Search01Icon} className="size-4 shrink-0" />
				</InputGroupText>
				<InputGroupInput
					aria-label={searchLabel}
					placeholder={searchLabel}
					value={(table.state.globalFilter as string) ?? ""}
					onChange={(event) => {
						table.setGlobalFilter(event.target.value);
						table.setPageIndex(0);
					}}
				/>
			</InputGroup>
			{children}
		</div>
	);
}

type TableColumnFilterProps<TData extends RowData> = {
	table: ReactTable<DataTableFeatures, TData>;
	columnId: string;
	label: string;
	options: readonly SelectOption[];
};

const every = "every";

export function TableColumnFilter<TData extends RowData>({
	table,
	columnId,
	label,
	options,
}: TableColumnFilterProps<TData>) {
	const column = table.getColumn(columnId);

	if (!column) {
		return null;
	}

	return (
		<Select
			items={[{ value: every, label: "Todos" }, ...options]}
			value={(column.getFilterValue() as string | undefined) ?? every}
			onValueChange={(value) => {
				column.setFilterValue(value === every ? undefined : value);
				table.setPageIndex(0);
			}}
		>
			<SelectTrigger className="w-44" aria-label={label}>
				<SelectValue placeholder={label} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={every}>Todos</SelectItem>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
