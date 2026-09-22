import { createRouter } from "@tanstack/react-router";

import { Route as AboutRoute } from "./routes/about";
import { Route as IndexRoute } from "./routes/index";
import { Route as RootRoute } from "./routes/__root";
import { Route as TestQueryRoute } from "./routes/test-query";

const routeTree = RootRoute.addChildren([
	IndexRoute,
	AboutRoute,
	TestQueryRoute,
]);

export const router = createRouter({
	routeTree,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export default router;
