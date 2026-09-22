import { Link, Outlet, createRootRoute } from "@tanstack/react-router";

function RootLayout() {
	return (
		<div className="min-h-screen">
			<header className="border-b border-border">
				<nav
					className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3"
					aria-label="Principal"
				>
					<Link to="/" className="font-semibold">
						Sistema Doações 2
					</Link>
					<ul className="flex flex-wrap justify-end gap-4">
						<li>
							<Link to="/">Início</Link>
						</li>
						<li>
							<Link to="/about">Sobre</Link>
						</li>
						<li>
							<Link to="/test-query">Test query</Link>
						</li>
					</ul>
				</nav>
			</header>
			<main className="mx-auto max-w-5xl px-4 py-8">
				<Outlet />
			</main>
		</div>
	);
}

export const Route = createRootRoute({
	component: RootLayout,
});
