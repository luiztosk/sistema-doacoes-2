import { createFileRoute } from "@tanstack/react-router";

import { LoginForm } from "@/react-app/components/auth/login-form";

function AuthPage() {
	return (
		<div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-8">
			<LoginForm />
		</div>
	);
}

export const Route = createFileRoute('/auth/login')({
	component: AuthPage,
});
