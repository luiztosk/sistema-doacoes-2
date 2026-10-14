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
		label: "Beneficiaries",
		description: "Register of assisted families and individuals.",
	},
	{
		path: "/contacts/donors",
		label: "Donors",
		description: "Register of donation sources.",
	},
	{
		path: "/inventory/items",
		label: "Inventory Items",
		description: "Item catalog and stock control.",
	},
	{
		path: "/inventory/categories",
		label: "Item Categories",
		description: "Categories for item classification.",
	},
	{
		path: "/inventory/donations",
		label: "Donations",
		description: "Donation registration and receipt.",
	},
	{
		path: "/inventory/deliveries",
		label: "Deliveries",
		description: "Stock reservations and deliveries.",
	},
];

export const homePath: Path = "/panel";
