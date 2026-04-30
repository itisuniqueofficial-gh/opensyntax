import {defineConfig} from 'tsup';

export default defineConfig({
	entry: ['src/cli.ts', 'src/index.ts'],
	format: ['esm'],
	target: 'node18',
	platform: 'node',
	sourcemap: true,
	clean: true,
	dts: true,
	shims: true,
	external: ['ink']
});
