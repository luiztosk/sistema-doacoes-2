import type { FileRoutesByTo } from "@/react-app/route-tree";

type Path = keyof FileRoutesByTo;

export type Resource = {
	readonly path: Path;
	readonly label: string;
	readonly description: string;
};

export const resources: readonly Resource[] = [
	{
		path: "/contacts/beneficiaries",
		label: "Beneficiários",
		description: "Cadastro de famílias e pessoas assistidas.",
	},
	{
		path: "/contacts/donors",
		label: "Doadores",
		description: "Cadastro das origens das doações.",
	},
	{
		path: "/inventory/item",
		label: "Itens de estoque",
		description: "Catálogo de itens e controle de estoque.",
	},
	{
		path: "/inventory/category",
		label: "Categorias de item",
		description: "Categorias para classificar os itens.",
	},
	{
		path: "/inventory/donations",
		label: "Doações",
		description: "Registro de doações e recebimento.",
	},
	{
		path: "/inventory/delivery",
		label: "Entregas",
		description: "Reserva de estoque e entregas.",
	},
	{
		path: "/inventory/stock",
		label: "Saldo",
		description: "O saldo de cada item: físico, reservado e disponível.",
	},
	{
		path: "/inventory/ledger",
		label: "Histórico",
		description: "Todos os movimentos de estoque, do mais recente ao mais antigo.",
	},
];

export const homePath: Path = "/panel";
