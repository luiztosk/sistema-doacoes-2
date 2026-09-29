import { Link, createFileRoute } from "@tanstack/react-router";

import { Card, CardDescription, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { resources } from "@/react-app/lib/navigation";

function Painel() {
	return (
		<section className="space-y-6">
			<header className="space-y-1">
				<h1 className="text-3xl font-bold">Início</h1>
				<p className="text-muted-foreground">
					Escolha uma área para começar.
				</p>
			</header>
			<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{resources.map((resource) => (
					<li key={resource.path}>
						<Link
							to={resource.path}
							className="block h-full rounded-2xl transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							<Card className="h-full">
								<CardHeader>
									<CardTitle>{resource.label}</CardTitle>
									<CardDescription>
										{resource.description}
									</CardDescription>
								</CardHeader>
							</Card>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}

export const Route = createFileRoute("/_authenticated/painel")({
	component: Painel,
});
