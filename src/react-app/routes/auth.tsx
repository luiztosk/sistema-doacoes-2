import { createRoute } from "@tanstack/react-router";

import { Auth } from "@/react-app/components/auth/auth";

import { Route as RootRoute } from "./__root";

function AuthPage() {
	return (
		<div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-8">
			<Auth />
		</div>
	);
}

export const Route = createRoute({
	getParentRoute: () => RootRoute,
	path: "/auth",
	component: AuthPage,
});
