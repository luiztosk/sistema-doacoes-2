import { createFileRoute } from "@tanstack/react-router";

import { Auth } from "@/react-app/components/auth/auth";

function AuthPage() {
	const { path } = Route.useParams();

	return (
		<div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-8">
			<Auth path={path ?? ""} />
		</div>
	);
}

export const Route = createFileRoute('/auth/$path')({
	component: AuthPage,
});
