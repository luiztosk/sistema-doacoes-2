import { Link, createFileRoute } from "@tanstack/react-router";

function About() {
	return (
		<section className="space-y-4">
			<h1 className="text-3xl font-bold">Sobre o projeto</h1>
			<p>
				O Sistema Doações 2 integra o cadastro de assistidos ao registro e ao
				acompanhamento de doações.
			</p>
			<p>
				É a segunda entrega do projeto integrador, escrita em React sobre
				Cloudflare Workers.
			</p>
			<Link to="/" className="text-primary underline underline-offset-4">
				Voltar ao início
			</Link>
		</section>
	);
}

export const Route = createFileRoute("/about")({
	component: About,
});
