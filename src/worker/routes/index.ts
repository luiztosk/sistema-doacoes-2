import { beneficiaryRoutes, donorRoutes } from "./contacts";
import {
	categoryRoutes,
	deliveryRoutes,
	donationRoutes,
	inventoryAdjustmentRoutes,
	inventoryCountRoutes,
	itemRoutes,
	ledgerRoutes,
	stockRoutes,
} from "./inventory";

export const apiRoutes = [
	...beneficiaryRoutes,
	...donorRoutes,
	...categoryRoutes,
	...itemRoutes,
	...donationRoutes,
	...deliveryRoutes,
	...inventoryCountRoutes,
	...inventoryAdjustmentRoutes,
	...stockRoutes,
	...ledgerRoutes,
];
