import { Link, createRoute } from "@tanstack/react-router";

import { Route as RootRoute } from "./__root";

function Index() {
	return (
		<section className="space-y-4">
			<h1 className="text-3xl font-bold">Bem-vindo ao Sistema Doações 2</h1>
			<p>
				Plataforma para cadastro de assistidos e controle de doações em
				instituições de caridade.
			</p>
			<Link
				to="/about"
				className="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground"
			>
				Conhecer o projeto
			</Link>
		</section>
	);
}

export const Route = createRoute({
	getParentRoute: () => RootRoute,
	path: "/",
	component: Index,
});
