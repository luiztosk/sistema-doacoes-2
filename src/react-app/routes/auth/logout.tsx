import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/react-app/lib/auth-client";
import { sessionQueryOptions } from "@/react-app/lib/queries/session";
import { queryClient } from "@/react-app/lib/query-client";

export const Route = createFileRoute("/auth/logout")({
	component: LogoutComponent,
});

function LogoutComponent() {
	const navigate = useNavigate();
	useEffect(() => {
		void (async () => {
			await authClient.signOut();

			queryClient.setQueryData(sessionQueryOptions.queryKey, null);

			await navigate({ to: "/" });
		})();
	}, [navigate]);
}
