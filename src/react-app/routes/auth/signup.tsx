import { createFileRoute } from "@tanstack/react-router";

import { SignUpForm } from "@/react-app/components/auth/SignUpForm";

function AuthPage() {
	return (
		<div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-8">
			<SignUpForm />
		</div>
	);
}

export const Route = createFileRoute('/auth/signup')({
	component: AuthPage,
});
