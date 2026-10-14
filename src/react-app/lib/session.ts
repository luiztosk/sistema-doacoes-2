import { queryOptions } from "@tanstack/react-query";

import { authClient } from "@/react-app/lib/auth-client";

export const sessionOptions = queryOptions({
	queryKey: ["session"],
	queryFn: async () => {
		const res = await authClient.getSession();
		if (res.error) {
			throw new Error(res.error.message);
		}
		return res.data;
	},
	staleTime: 1000 * 60 * 5,
});
