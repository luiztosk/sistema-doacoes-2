import { UserMenu } from "@/react-app/components/layout/user-menu";
import { SidebarTrigger } from "@/react-app/components/ui/sidebar";

export function AppHeader() {
	return (
		<header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
			<SidebarTrigger />
			<div className="ml-auto">
				<UserMenu />
			</div>
		</header>
	);
}
