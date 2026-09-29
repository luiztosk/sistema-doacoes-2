import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Avatar, AvatarFallback } from "@/react-app/components/ui/avatar";
import { Button, buttonVariants } from "@/react-app/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
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

function firstName(name: string | null | undefined): string {
	return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export function UserMenu() {
	const { data: session } = useQuery(sessionQueryOptions);

	if (!session) {
		return (
			<div className="flex items-center gap-2">
				<Link
					to="/auth/login"
					className={buttonVariants({ size: "sm" })}
				>
					Entrar
				</Link>
				<Link
					to="/auth/signup"
					className={buttonVariants({ variant: "outline", size: "sm" })}
				>
					Cadastrar-se
				</Link>
			</div>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						className="h-auto gap-2 py-1.5 pr-2 pl-1.5"
						aria-label="Abrir menu do usuário"
					/>
				}
			>
				<Avatar className="size-7">
					<AvatarFallback className="text-xs">
						{initials(session.user.name)}
					</AvatarFallback>
				</Avatar>
				<span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
					{firstName(session.user.name)}
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuGroup>
					<DropdownMenuLabel>
						<span className="block truncate font-medium">
							{session.user.name}
						</span>
						<span className="block truncate text-sm font-normal text-muted-foreground">
							{session.user.email}
						</span>
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem render={<Link to="/painel" />}>
						Início
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						render={<Link to="/auth/logout" />}
					>
						Sair
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
