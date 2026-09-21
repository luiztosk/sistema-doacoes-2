import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel"
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
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
