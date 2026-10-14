import { Link, createFileRoute } from "@tanstack/react-router";

import { Card, CardDescription, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { resources } from "@/react-app/lib/navigation";

function Panel() {
	return (
		<section className="space-y-6">
			<header className="space-y-1">
				<h1 className="text-3xl font-bold">Home</h1>
				<p className="text-muted-foreground">
					Choose an area to get started.
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

export const Route = createFileRoute("/_authenticated/panel")({
	component: Panel,
});
