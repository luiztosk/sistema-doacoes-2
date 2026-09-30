import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	createColumnHelper,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";

import type { Assistido } from "@/react-app/lib/api/assistidos";
import { assistidoOptions } from "@/react-app/lib/api/assistidos";
import { Button } from "@/react-app/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/react-app/components/ui/table";

const empty = "—";

const cityLabel = (row: Assistido) =>
	[row.cidade, row.uf].filter(Boolean).join(" / ");

const features = tableFeatures({});

const columnHelper = createColumnHelper<typeof features, Assistido>();

const columns = columnHelper.columns([
	columnHelper.accessor("nome", { header: "Nome" }),
	columnHelper.accessor(cityLabel, {
		id: "cityLabel",
		header: "Cidade",
		cell: ({ getValue }) => getValue() || empty,
	}),
	columnHelper.accessor("telefone", {
		header: "Telefone",
		cell: ({ getValue }) => getValue() ?? empty,
	}),
	columnHelper.accessor("email", {
		header: "E-mail",
		cell: ({ getValue }) => getValue() ?? empty,
	}),
	columnHelper.accessor("renda", {
		header: "Renda",
		cell: ({ getValue }) => {
			const value = getValue();
			return value == null ? empty : `R$ ${value.toFixed(2)}`;
		},
	}),
	columnHelper.accessor("tipoImovel", {
		header: "Tipo de imóvel",
		cell: ({ getValue }) => getValue() ?? empty,
	}),
	columnHelper.accessor("cestaBasica", {
		header: "Cesta básica",
		cell: ({ getValue }) => {
			const value = getValue();
			return value == null ? empty : value ? "Sim" : "Não";
		},
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
		data: data ?? [],
		getRowId: (row) => row.id,
	});

	return (
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
				{table.getRowModel().rows.map((row) => (
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
				))}
			</TableBody>
		</Table>
	);
}
