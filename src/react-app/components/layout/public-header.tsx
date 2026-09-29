import { Link } from "@tanstack/react-router";

import { UserMenu } from "@/react-app/components/layout/user-menu";

export function PublicHeader() {
	return (
		<header className="border-b border-border">
			<nav
				className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3"
				aria-label="Principal"
			>
				<Link to="/" className="font-semibold">
					Sistema Doações 2
				</Link>
				<UserMenu />
			</nav>
		</header>
	);
}
