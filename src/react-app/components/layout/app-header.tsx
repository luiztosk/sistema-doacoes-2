import { UserMenu } from "@/react-app/components/layout/user-menu";

export function AppHeader() {
	return (
		<header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
			<div className="ml-auto">
				<UserMenu />
			</div>
		</header>
	);
}
