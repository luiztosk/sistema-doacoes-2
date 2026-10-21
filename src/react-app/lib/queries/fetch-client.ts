import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import type { paths } from "@/schemas/openapi/schema";

const fetchClient = createFetchClient<paths>({
	// baseUrl: "/api/v1"
});

export const $api = createClient(fetchClient);

/**
 * Toda resposta de sucesso vem no envelope `{ data }`, e é o `data` que a
 * tela consome. A resposta de **erro** não tem envelope — e o `401`, que é a
 * única resposta sem corpo, chega como `null` — então o `select` precisa
 * aguentar o `null` em vez de explodir nele.
 */
export function semEnvelope<T>(
	response: { data: T } | null | undefined,
): T | undefined {
	return response?.data;
}
