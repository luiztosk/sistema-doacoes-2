import { $api } from "../fetch-client";

export const beneficiaryKeys = {
	all: ["beneficiaries"] as const,
	detail: (id: string) => [...beneficiaryKeys.all, id] as const,
};

export const beneficiariesOptions = $api.queryOptions(
	"get", "/api/v1/beneficiaries"
);

export const beneficiaryOptions = (id: string) =>
	$api.queryOptions("get", "/api/v1/beneficiaries/{id}", {
		params: {
			path: { id: id }
		},
	});

// export const createBeneficiaryMutation = () =>
// 	$api.useMutation("post", "/api/v1/beneficiaries");

// export const updateBeneficiaryMutation = () =>
// 	$api.useMutation("patch", "/api/v1/beneficiaries/{id}");
