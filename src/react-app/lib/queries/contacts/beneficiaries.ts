import { mutationOptions, queryOptions } from "@tanstack/react-query";

import type {
	BeneficiaryInsert,
	BeneficiarySelect,
	BeneficiaryTableView,
	BeneficiaryUpdate,
} from "@/schemas/zod/contacts";

export const beneficiaryKeys = {
	all: ["beneficiaries"] as const,
	detail: (id: string) => [...beneficiaryKeys.all, id] as const,
};

const endpoint = "/api/v1/beneficiaries";

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

export const beneficiaryTableOptions = queryOptions({
	queryKey: beneficiaryKeys.all,
	queryFn: async (): Promise<BeneficiaryTableView[]> => {
		const { data } = await request<BeneficiaryTableView[]>(endpoint, { method: "GET" });
		return data;
	},
	staleTime: 1000 * 30,
});

export const beneficiaryOptions = (id: string) =>
	queryOptions({
		queryKey: beneficiaryKeys.detail(id),
		queryFn: async (): Promise<BeneficiarySelect> => {
			const { data } = await request<BeneficiarySelect>(
				`${endpoint}/${id}`,
				{ method: "GET" },
			);
			return data;
		},
	});

export const createBeneficiaryOptions = mutationOptions({
	mutationKey: [...beneficiaryKeys.all, "create"],
	mutationFn: async (payload: BeneficiaryInsert): Promise<BeneficiaryInsert> => {
		const { data } = await request<BeneficiarySelect>(endpoint, {
			method: "POST",
			body: JSON.stringify(payload),
		});
		return data;
	},
});

export const updateBeneficiaryOptions = (id: string) =>
	mutationOptions({
		mutationKey: [...beneficiaryKeys.all, "update"],
		mutationFn: async (
			payload: BeneficiaryUpdate,
		): Promise<BeneficiaryUpdate> => {
			const { data } = await request<BeneficiaryUpdate>(`${endpoint}/${id}`, {
				method: "PATCH",
				body: JSON.stringify(payload),
			});
			return data;
		},
	});
