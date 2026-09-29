import { queryOptions } from "@tanstack/react-query";
import type { infer as ZodInfer } from "zod";

import type { assistidoSelectSchema } from "@/worker/db/schema";

/**
 * A linha inteira, como o banco a devolve. O tipo vem do schema e nao e
 * escrito a mao: mudar a tabela muda este tipo, sem nenhum passo aqui.
 */
type AssistidoCompleto = ZodInfer<typeof assistidoSelectSchema>;

/**
 * Os campos que a tabela de assistidos mostra. Tudo que o schema nao lista
 * aqui e ignorado no cliente — o endpoint devolve a linha completa.
 *
 * O `Pick` existe para a tela nao carregar 25 colunas de cabeca. Para exibir
 * mais uma, e so acrescentar o nome do campo nesta lista.
 */
export type Assistido = Pick<
	AssistidoCompleto,
	| "id"
	| "nome"
	| "cidade"
	| "uf"
	| "telefone"
	| "email"
	| "renda"
	| "tipoImovel"
	| "cestaBasica"
>;

export const assistidosQueryOptions = queryOptions({
	queryKey: ["assistidos"],
	queryFn: async (): Promise<Assistido[]> => {
		const res = await fetch("/api/v1/assistidos", {
			credentials: "include",
		});

		// 401 e a unica resposta sem corpo, entao o status precisa ser
		// conferido antes de tentar ler o envelope de erro.
		if (!res.ok) {
			throw new Error(`Could not load the assistidos: ${res.status}`);
		}

		const body = (await res.json()) as { data: Assistido[] };
		return body.data;
	},
});
