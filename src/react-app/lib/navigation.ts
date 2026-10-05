import type { FileRoutesByTo } from "@/react-app/route-tree";

type Path = keyof FileRoutesByTo;

export type Resource = {
	readonly path: Path;
	readonly label: string;
	readonly description: string;
};

export const resources: readonly Resource[] = [
	{
		path: "/assistidos",
		label: "Assistidos",
		description: "Cadastro das famílias e pessoas atendidas.",
	},
	{
		path: "/doadores",
		label: "Doadores",
		description: "Cadastro de quem faz as doações.",
	},
	{
		path: "/inventory-items",
		label: "Itens de estoque",
		description: "Catálogo de itens e controle de estoque.",
	},
	{
		path: "/item-categories",
		label: "Categorias de item",
		description: "Categorias para classificacao de itens.",
	},
	{
		path: "/donations",
		label: "Doacoes",
		description: "Registro e recebimento de doacoes.",
	},
	{
		path: "/deliveries",
		label: "Entregas",
		description: "Reservas e entregas de estoque.",
	},
];

export const homePath: Path = "/painel";
