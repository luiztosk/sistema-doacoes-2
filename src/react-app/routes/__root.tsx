import type { QueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useNavigate
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AuthProvider } from "@/react-app/components/auth/auth-provider";
// import { UserMenu } from "@/react-app/components/auth/user-menu";
import { authClient } from "@/react-app/lib/auth-client";
import { queryClient } from "@/react-app/lib/query-client";
import { SignOut } from "../components/auth/sign-out";
import { UserButton } from "../components/auth/user/user-button";

function Providers({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <AuthProvider
      authClient={authClient}
      emailAndPassword={{ requireEmailVerification: false }}
      navigate={navigate}
      queryClient={queryClient}
      redirectTo="/test-query"
      Link={({ href, ...props }) => <Link to={href} {...props} />}
    >
      {children}
    </AuthProvider>
  );
}

function RootLayout() {
	return (
		<Providers>
			<div className="min-h-screen">
				<header className="border-b border-border">
					<nav
						className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3"
						aria-label="Principal"
					>
						<Link to="/" className="font-semibold">
							Sistema Doações 2
						</Link>
						<div className="flex flex-wrap items-center justify-end gap-4">
							<ul className="flex flex-wrap justify-end gap-4">
								<li>
									<Link to="/">Início</Link>
								</li>
								<li>
									<Link to="/about">Sobre</Link>
								</li>
								<li>
									<Link to="/test-query">Test query</Link>
								</li>
								<li>
									<UserButton />
								</li>
							</ul>
							{/* <UserMenu /> */}
						</div>
					</nav>
				</header>
				<main className="mx-auto max-w-5xl px-4 py-8">
					<Outlet />
				</main>
			</div>
		</Providers>
	);
}

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
	component: RootLayout,
});
