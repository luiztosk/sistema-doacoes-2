import { MoonIcon, Sun01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";

import { Button } from "@/react-app/components/ui/button";
import { DropdownMenuItem } from "@/react-app/components/ui/dropdown-menu";

type ThemeToggleProps = {
	readonly iconOnly?: boolean;
	readonly asMenuItem?: boolean;
};

export function ThemeToggle({
	iconOnly = false,
	asMenuItem = false,
}: ThemeToggleProps) {
	const { resolvedTheme, setTheme } = useTheme();
	const isDark = resolvedTheme === "dark";
	const label = isDark ? "Tema claro" : "Tema escuro";

	const content = (
		<>
			<HugeiconsIcon
				icon={isDark ? Sun01Icon : MoonIcon}
				strokeWidth={2}
				className="size-4 shrink-0"
			/>
			{iconOnly ? null : <span>{label}</span>}
		</>
	);

	if (asMenuItem) {
		return (
			<DropdownMenuItem
				className="cursor-pointer"
				onClick={() => setTheme(isDark ? "light" : "dark")}
			>
				{content}
			</DropdownMenuItem>
		);
	}

	return (
		<Button
			variant="ghost"
			size={iconOnly ? "icon-sm" : "sm"}
			className={iconOnly ? undefined : "w-full justify-start gap-2"}
			aria-label={label}
			onClick={() => setTheme(isDark ? "light" : "dark")}
		>
			{content}
		</Button>
	);
}
