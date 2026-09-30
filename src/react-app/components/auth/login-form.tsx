import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";

import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/react-app/components/ui/card";
import { authClient } from "@/react-app/lib/auth-client";
import { sessionOptions } from "@/react-app/lib/api/session";

export function LoginForm() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const form = useForm({
		defaultValues: { email: "", password: "" },
		onSubmit: async ({ value }) => {
			const { data, error } = await authClient.signIn.email({
				email: value.email,
				password: value.password,
			});

			if (error) {
				alert(error.message);
				return;
			}

			if (data) {
				await queryClient.invalidateQueries({
					queryKey: sessionOptions.queryKey,
				});
			}

			await router.invalidate();

			router.navigate({ to: "/painel" });
		},
	});

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Entrar</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field
						name="email"
						children={(field) => (
							<div>
								<label className="text-sm font-medium">E-mail</label>
								<Input
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									type="email"
									required
								/>
							</div>
						)}
					/>
					<form.Field
						name="password"
						children={(field) => (
							<div>
								<label className="text-sm font-medium">Senha</label>
								<Input
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									type="password"
									required
								/>
							</div>
						)}
					/>
					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
						children={([canSubmit, isSubmitting]) => (
							<Button type="submit" disabled={!canSubmit} className="w-full">
								{isSubmitting ? "Entrando..." : "Entrar"}
							</Button>
						)}
					/>
				</form>
				<p className="mt-4 text-center text-sm text-muted-foreground">
					Ainda não tem conta?{" "}
					<Link to="/auth/signup" className="underline">
						Cadastre-se
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
