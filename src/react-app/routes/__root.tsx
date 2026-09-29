import { QueryClient, useQuery } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import { PublicHeader } from "@/react-app/components/layout/public-header";
import { sessionQueryOptions } from "@/react-app/lib/auth-queries";

function RootLayout() {
	const { data: session } = useQuery(sessionQueryOptions);

	if (session) {
		return <Outlet />;
	}

	return (
		<div className="flex min-h-svh flex-col">
			<PublicHeader />
			<main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
				<Outlet />
			</main>
		</div>
	);
}

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
	beforeLoad: async ({ context }) => {
		await context.queryClient
			.ensureQueryData(sessionQueryOptions)
			.catch(() => null);
	},
	component: RootLayout,
});
