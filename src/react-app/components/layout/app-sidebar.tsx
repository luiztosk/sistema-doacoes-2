import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useMatchRoute } from "@tanstack/react-router";

import { ThemeToggle } from "@/react-app/components/layout/theme-toggle";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/react-app/components/ui/sidebar";
import { homePath, resources } from "@/react-app/lib/navigation";

export function AppSidebar() {
	const matchRoute = useMatchRoute();

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<Link
					to={homePath}
					className="flex h-8 items-center gap-2 rounded-md px-2 font-semibold"
				>
					Sistema Doações 2
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Menu</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									isActive={Boolean(matchRoute({ to: homePath, fuzzy: false }))}
									tooltip="Início"
									render={<Link to={homePath} />}
								>
									Início
								</SidebarMenuButton>
							</SidebarMenuItem>
							{resources.map((resource) => (
								<SidebarMenuItem key={resource.path}>
									<SidebarMenuButton
										isActive={Boolean(
											matchRoute({ to: resource.path, fuzzy: false }),
										)}
										tooltip={resource.label}
										render={<Link to={resource.path} />}
									>
										{resource.label}
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarSeparator className="mx-2 w-auto" />
				<SidebarMenu>
					<SidebarMenuItem>
						<ThemeToggle />
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton
							tooltip="Sair"
							render={<Link to="/auth/logout" />}
						>
							<HugeiconsIcon
								icon={Logout01Icon}
								strokeWidth={2}
								className="size-4"
							/>
							Sair
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
