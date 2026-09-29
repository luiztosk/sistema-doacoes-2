import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Avatar, AvatarFallback } from "@/react-app/components/ui/avatar";
import { Button } from "@/react-app/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import { sessionQueryOptions } from "@/react-app/lib/auth-queries";

function initials(name: string | null | undefined): string {
	const trimmed = (name ?? "").trim();
	if (trimmed === "") return "?";
	return trimmed
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

export function UserMenu() {
	const { data: session } = useQuery(sessionQueryOptions);

	if (!session) {
		return (
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" render={<Link to="/auth/login" />}>
					Entrar
				</Button>
				<Button size="sm" render={<Link to="/auth/signup" />}>
					Cadastrar-se
				</Button>
			</div>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon-sm" aria-label="Abrir menu do usuário" />
				}
			>
				<Avatar>
					<AvatarFallback>{initials(session.user.name)}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>
					<span className="block truncate font-medium">
						{session.user.name}
					</span>
					<span className="block truncate text-sm font-normal text-muted-foreground">
						{session.user.email}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem render={<Link to="/painel" />}>Início</DropdownMenuItem>
				<DropdownMenuItem
					variant="destructive"
					render={<Link to="/auth/logout" />}
				>
					Sair
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
