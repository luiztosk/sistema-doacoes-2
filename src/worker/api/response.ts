import type { z } from "zod";

/**
 * A resposta é validada contra o contrato antes de sair. O `.strict()` do
 * schema é o que reprova uma linha carregando campo a mais — sem ele, o zod
 * descarta o campo e o bug passa em silêncio.
 */
export function parseResponse<T extends z.ZodType>(
	schema: T,
	payload: unknown,
): z.infer<T> {
	const parsed = schema.safeParse(payload);

	if (!parsed.success) {
		console.error("resposta fora do contrato", parsed.error.issues);
		throw new Error("The response does not match the contract.");
	}

	return parsed.data;
}
