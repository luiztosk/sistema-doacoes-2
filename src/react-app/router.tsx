import { createRouter } from "@tanstack/react-router";


import { routeTree } from "./route-tree";
import { queryClient } from "@/react-app/lib/query-client";

export const router = createRouter({
	routeTree,
	context: {
		queryClient
	}
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export default router;
