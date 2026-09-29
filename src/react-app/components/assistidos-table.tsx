import { useQuery } from "@tanstack/react-query";
import {
	createColumnHelper,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";

import type { Assistido } from "@/react-app/lib/assistidos-queries";
import { assistidosQueryOptions } from "@/react-app/lib/assistidos-queries";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/react-app/components/ui/table";

/** Celula sem valor: todo campo do assistido, menos `nome`, aceita nulo. */
const vazio = "—";

/** O banco guarda `cidade` e `uf` em colunas separadas. */
const cidade = (linha: Assistido) =>
	[linha.cidade, linha.uf].filter(Boolean).join(" / ");

/**
 * Vazio de proposito enquanto a tabela so le. Na primeira vez que entrar
 * ordenacao ou filtro, isto vira algo como
 *
 *   tableFeatures({
 *     rowSortingFeature,
 *     sortedRowModel: createSortedRowModel(),
 *     sortFns,
 *   })
 *
 * e nada mais abaixo muda: o `columnHelper`, as colunas e o `useTable`
 * continuam iguais. Vale a pena citar os nomes das features para o
 * TypeScript passar a conhecer `sorting` e `columnFilters`.
 */
const features = tableFeatures({});

const columnHelper = createColumnHelper<typeof features, Assistido>();

const columns = columnHelper.columns([
	columnHelper.accessor("nome", { header: "Nome" }),
	columnHelper.accessor(cidade, {
		id: "cidade",
		header: "Cidade",
		cell: ({ getValue }) => getValue() || vazio,
	}),
	columnHelper.accessor("telefone", {
		header: "Telefone",
		cell: ({ getValue }) => getValue() ?? vazio,
	}),
	columnHelper.accessor("email", {
		header: "E-mail",
		cell: ({ getValue }) => getValue() ?? vazio,
	}),
	columnHelper.accessor("renda", {
		header: "Renda",
		cell: ({ getValue }) => {
			const valor = getValue();
			return valor == null ? vazio : `R$ ${valor.toFixed(2)}`;
		},
	}),
	columnHelper.accessor("tipoImovel", {
		header: "Tipo de imóvel",
		cell: ({ getValue }) => getValue() ?? vazio,
	}),
	columnHelper.accessor("cestaBasica", {
		header: "Cesta básica",
		cell: ({ getValue }) => {
			const valor = getValue();
			return valor == null ? vazio : valor ? "Sim" : "Não";
		},
	}),
]);

export function AssistidosTable() {
	const { data } = useQuery(assistidosQueryOptions);

	const table = useTable({
		features,
		columns,
		data: data ?? [],
		getRowId: (linha) => linha.id,
	});

	return (
		<Table>
			<TableHeader>
				{table.getHeaderGroups().map((grupo) => (
					<TableRow key={grupo.id}>
						{grupo.headers.map((cabecalho) => (
							<TableHead key={cabecalho.id}>
								{cabecalho.isPlaceholder ? null : (
									<table.FlexRender header={cabecalho} />
								)}
							</TableHead>
						))}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows.map((linha) => (
					<TableRow key={linha.id}>
						{linha.getAllCells().map((celula) => (
							<TableCell key={celula.id}>
								<table.FlexRender cell={celula} />
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
