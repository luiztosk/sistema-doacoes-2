import { $api } from "../fetch-client";

export const donorKeys = {
	all: ["donors"] as const,
	detail: (id: string) => [...donorKeys.all, id] as const,
};

export const donorOptions = $api.queryOptions(
	"get", "/api/v1/donors"
);

export const donorDetailOptions = (id: string) =>
	$api.queryOptions("get", "/api/v1/donors/{id}", {
		params: {
			path: { id: id }
		},
	});

// export const createDonorMutation = () =>
// 	$api.useMutation("post", "/api/v1/donors");

// export const updateDonorMutation = () =>
// 	$api.useMutation("patch", "/api/v1/donors/{id}");