import { queryOptions } from "@tanstack/react-query";
import type { infer as ZodInfer } from "zod";

import type { assistidoSelectSchema } from "@/worker/db/schema";

type AssistidoCompleto = ZodInfer<typeof assistidoSelectSchema>;

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

		if (!res.ok) {
			throw new Error(`Could not load the assistidos: ${res.status}`);
		}

		const body = (await res.json()) as { data: Assistido[] };
		return body.data;
	},
});
