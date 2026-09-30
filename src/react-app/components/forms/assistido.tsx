import type { Assistido } from "@/react-app/lib/queries/assistidos";

type AssistidoFormProps = {
	assistido?: Assistido;
};

export function AssistidoForm({ assistido }: AssistidoFormProps) {
	return (
		<section className="space-y-4">
			<h1 className="text-3xl font-bold">
				{assistido ? "Editar assistido" : "Novo assistido"}
			</h1>
		</section>
	);
}