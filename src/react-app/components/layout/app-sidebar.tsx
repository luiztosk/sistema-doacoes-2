import { Link, useMatchRoute } from "@tanstack/react-router";

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
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
		</Sidebar>
	);
}
