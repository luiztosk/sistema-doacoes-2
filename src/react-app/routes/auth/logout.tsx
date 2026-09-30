import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/react-app/lib/auth-client";
import { sessionOptions } from "@/react-app/lib/api/session";
import { queryClient } from "@/react-app/lib/query-client";

export const Route = createFileRoute("/auth/logout")({
	component: LogoutComponent,
});

function LogoutComponent() {
	const navigate = useNavigate();
	useEffect(() => {
		void (async () => {
			await authClient.signOut();

			queryClient.setQueryData(sessionOptions.queryKey, null);

			await navigate({ to: "/" });
		})();
	}, [navigate]);
}
