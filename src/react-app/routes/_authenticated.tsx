import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppHeader } from "@/react-app/components/layout/app-header";
import { AppSidebar } from "@/react-app/components/layout/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
} from "@/react-app/components/ui/sidebar";
import { sessionQueryOptions } from "@/react-app/lib/queries/session";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context }) => {
		try {
			const session = await context.queryClient.ensureQueryData(
				sessionQueryOptions,
			);
			if (!session) {
				throw redirect({ to: "/auth/login" });
			}
		} catch {
			throw redirect({ to: "/auth/login" });
		}
	},
	component: () => (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<AppHeader />
				<div className="flex-1 px-4 py-6 md:p-6">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	),
});
