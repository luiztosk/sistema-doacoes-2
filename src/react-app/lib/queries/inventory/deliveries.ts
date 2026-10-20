import { $api } from "../fetch-client";

export const deliveryKeys = {
	all: ["deliveries"] as const,
	detail: (id: string) => [...deliveryKeys.all, id] as const,
};

export const deliveryOptions = $api.queryOptions(
	"get", "/api/v1/deliveries"
);

export function deliveryDetailOptions(id: string) {
	return $api.queryOptions("get", "/api/v1/deliveries/{id}", {
		params: { path: { id } },
	});
}

export const createDeliveryMutation = () =>
	$api.useMutation("post", "/api/v1/deliveries");

export const updateDeliveryMutation = () =>
	$api.useMutation("patch", "/api/v1/deliveries/{id}");
