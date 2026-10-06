import { mutationOptions, queryOptions } from "@tanstack/react-query";

import type {
	DonorSelect,
	DonorInsert,
	DonorUpdate,
	DonorTableView,
} from "@/schemas/zod/contacts";


export const donorKeys = {
	all: ["donors"] as const,
	detail: (id: string) => [...donorKeys.all, id] as const,
};

const endpoint = "/api/v1/donors";

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

export const donorOptions = queryOptions({
	queryKey: donorKeys.all,
	queryFn: async (): Promise<DonorTableView[]> => {
		const { data } = await request<DonorTableView[]>(endpoint, { method: "GET" });
		return data;
	},
	staleTime: 1000 * 30,
});

export const donorDetailOptions = (id: string) =>
	queryOptions({
		queryKey: donorKeys.detail(id),
		queryFn: async (): Promise<DonorSelect> => {
			const { data } = await request<DonorSelect>(`${endpoint}/${id}`, {
				method: "GET",
			});
			return data;
		},
	});

export const createDonorOptions = mutationOptions({
	mutationKey: [...donorKeys.all, "create"],
	mutationFn: async (payload: DonorInsert): Promise<DonorSelect> => {
		const { data } = await request<DonorSelect>(endpoint, {
			method: "POST",
			body: JSON.stringify(payload),
		});
		return data;
	},
});

export const updateDonorOptions = (id: string) =>
	mutationOptions({
		mutationKey: [...donorKeys.all, "update"],
		mutationFn: async (payload: DonorUpdate): Promise<DonorSelect> => {
			const { data } = await request<DonorSelect>(`${endpoint}/${id}`, {
				method: "PATCH",
				body: JSON.stringify(payload),
			});
			return data;
		},
	});
