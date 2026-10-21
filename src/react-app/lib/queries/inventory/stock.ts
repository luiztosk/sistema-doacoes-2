import { $api } from "../fetch-client";

export const stockKeys = {
	all: ["stock"] as const,
};

export const stockOptions = $api.queryOptions("get", "/api/v1/stock", {}, {
	select: (response) => response.data,
});
