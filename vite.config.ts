import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel"
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
	plugins: [
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
			routesDirectory: "src/react-app/routes",
			generatedRouteTree: "src/react-app/route-tree.tsx",
		}),
		babel({
			presets: [reactCompilerPreset()],
		}),
		react(), 
		cloudflare(),
		tailwindcss(),
	],
	resolve: {
		tsconfigPaths: true,
	},
});
