import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { infer as ZodInfer } from "zod";

import type {
	assistidoInsertSchema,
	assistidoSelectSchema,
} from "@/worker/db/schema";

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

export type AssistidoCompleto = ZodInfer<typeof assistidoSelectSchema>;

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type AssistidoFormValues = RequiredNullable<
	ZodInfer<typeof assistidoInsertSchema>
>;

export const assistidoKeys = {
	all: ["assistidos"] as const,
	detail: (id: string) => [...assistidoKeys.all, id] as const,
};

const endpoint = "/api/v1/assistidos";

type ApiError = { code: string; message: string };

async function request<T>(
	path: string,
	init: RequestInit,
): Promise<{ data: T }> {
	const res = await fetch(path, {
		credentials: "include",
		...init,
		headers: { "content-type": "application/json", ...init.headers },
	});

	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: ApiError;
		} | null;
		throw Object.assign(
			new Error(body?.error?.message ?? `Request failed with ${res.status}`),
			{ code: body?.error?.code ?? "UNKNOWN" },
		);
	}

	return (await res.json()) as { data: T };
}

export const assistidoOptions = queryOptions({
	queryKey: assistidoKeys.all,
	queryFn: async (): Promise<Assistido[]> => {
		const { data } = await request<Assistido[]>(endpoint, { method: "GET" });
		return data;
	},
});

export const assistidoDetailOptions = (id: string) =>
	queryOptions({
		queryKey: assistidoKeys.detail(id),
		queryFn: async (): Promise<AssistidoCompleto> => {
			const { data } = await request<AssistidoCompleto>(
				`${endpoint}/${id}`,
				{ method: "GET" },
			);
			return data;
		},
	});

export const createAssistidoOptions = mutationOptions({
	mutationKey: [...assistidoKeys.all, "create"],
	mutationFn: async (payload: AssistidoFormValues): Promise<AssistidoCompleto> => {
		const { data } = await request<AssistidoCompleto>(endpoint, {
			method: "POST",
			body: JSON.stringify(payload),
		});
		return data;
	},
});

export const updateAssistidoOptions = (id: string) =>
	mutationOptions({
		mutationKey: [...assistidoKeys.all, "update"],
		mutationFn: async (
			payload: AssistidoFormValues,
		): Promise<AssistidoCompleto> => {
			const { data } = await request<AssistidoCompleto>(`${endpoint}/${id}`, {
				method: "PATCH",
				body: JSON.stringify(payload),
			});
			return data;
		},
	});
