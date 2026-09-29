import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@/react-app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/react-app/components/ui/card";

function Landing() {
	return (
		<section className="space-y-8">
			<header className="space-y-3">
				<h1 className="text-3xl font-bold">Sistema Doações 2</h1>
				<p className="text-muted-foreground">
					Cadastro de assistidos e controle de doações em instituições de
					caridade. As famílias e pessoas atendidas, os doadores e as
					coletas e entregas ficam registrados no mesmo lugar.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Para começar</CardTitle>
					<CardDescription>
						Entre com uma conta ou crie a sua. As telas do sistema ficam
						disponíveis depois que você entrar.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-3">
					<Button render={<Link to="/auth/login" />}>Entrar</Button>
					<Button variant="outline" render={<Link to="/auth/signup" />}>
						Cadastrar-se
					</Button>
				</CardContent>
			</Card>

			<p className="text-sm text-muted-foreground">
				<Link to="/about" className="underline underline-offset-4">
					Sobre o projeto
				</Link>
			</p>
		</section>
	);
}

export const Route = createFileRoute("/")({
	component: Landing,
});
