import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist"] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
		},
	},
	{
		// Componentes do shadcn: exportam o componente e o `cva` de variantes no
		// mesmo arquivo, que e a convencao da lib. A regra existe para nao
		// quebrar o HMR, e aqui o custo de quebrar e maior que o beneficio. A
		// excecao fica no config e nao em comentario no arquivo, porque
		// `npx shadcn add` sobrescreve o arquivo e levaria o comentario junto.
		files: ["src/react-app/components/ui/**/*.{ts,tsx}"],
		rules: { "react-refresh/only-export-components": "off" },
	},
	{
		// `worker-configuration.d.ts` e gerado por `npm run cf-typegen`, e o
		// proprio gerador emite `// eslint-disable-line` que o lint nao
		// considera necessario. Editar o arquivo nao adianta: a proxima
		// geracao traz de volta.
		files: ["worker-configuration.d.ts"],
		linterOptions: { reportUnusedDisableDirectives: "off" },
	},
);
