import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		core: "src/core/index.ts",
		react: "src/react/index.ts",
		server: "src/server/index.ts",
		zod: "src/zod/index.ts",
		"platforms/react": "src/platforms/react/index.ts",
		"platforms/react-native": "src/platforms/react-native/index.ts",
	},
	format: ["esm"],
	dts: false,
	clean: true,
	sourcemap: true,
	external: [
		"react",
		"react-dom",
		"react-native",
		"expo-localization",
		"expo-sqlite",
		"zod",
	],
});
