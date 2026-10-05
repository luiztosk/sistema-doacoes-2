import {
	columnFilteringFeature,
	constructFilterFn,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFn_equalsString,
	filterFn_includesString,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_basic,
	tableFeatures,
} from "@tanstack/react-table";

const semAcento = (value: unknown) =>
	String(value ?? "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "");

const includesString = constructFilterFn({
	...filterFn_includesString,
	resolveDataValue: semAcento,
	resolveFilterValue: semAcento,
});

export const features = tableFeatures({
	columnFilteringFeature,
	globalFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns: { includesString, equalsString: filterFn_equalsString },
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
});

export type DataTableFeatures = typeof features;

export const ariaSort = (sorted: false | "asc" | "desc") => {
	if (sorted === "asc") return "ascending" as const;
	if (sorted === "desc") return "descending" as const;
	return "none" as const;
};
