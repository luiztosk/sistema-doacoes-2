import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { infer as ZodInfer } from "zod";

import type {
	doadorInsertSchema,
	doadorSelectSchema,
} from "@/worker/db/schema";

export type Doador = Pick<
	DoadorCompleto,
	"id" | "nome" | "cidade" | "uf" | "telefone" | "email"
>;

export type DoadorCompleto = ZodInfer<typeof doadorSelectSchema>;

type RequiredNullable<TForm> = {
	[K in keyof TForm]-?: Exclude<TForm[K], undefined> | null;
};

export type DoadorFormValues = RequiredNullable<
	ZodInfer<typeof doadorInsertSchema>
>;

export const doadorKeys = {
	all: ["doadores"] as const,
	detail: (id: string) => [...doadorKeys.all, id] as const,
};

const endpoint = "/api/v1/doadores";

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

export const doadorOptions = queryOptions({
	queryKey: doadorKeys.all,
	queryFn: async (): Promise<Doador[]> => {
		const { data } = await request<Doador[]>(endpoint, { method: "GET" });
		return data;
	},
	staleTime: 1000 * 30,
});

export const doadorDetailOptions = (id: string) =>
	queryOptions({
		queryKey: doadorKeys.detail(id),
		queryFn: async (): Promise<DoadorCompleto> => {
			const { data } = await request<DoadorCompleto>(`${endpoint}/${id}`, {
				method: "GET",
			});
			return data;
		},
	});

export const createDoadorOptions = mutationOptions({
	mutationKey: [...doadorKeys.all, "create"],
	mutationFn: async (payload: DoadorFormValues): Promise<DoadorCompleto> => {
		const { data } = await request<DoadorCompleto>(endpoint, {
			method: "POST",
			body: JSON.stringify(payload),
		});
		return data;
	},
});

export const updateDoadorOptions = (id: string) =>
	mutationOptions({
		mutationKey: [...doadorKeys.all, "update"],
		mutationFn: async (payload: DoadorFormValues): Promise<DoadorCompleto> => {
			const { data } = await request<DoadorCompleto>(`${endpoint}/${id}`, {
				method: "PATCH",
				body: JSON.stringify(payload),
			});
			return data;
		},
	});
