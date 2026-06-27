import { defineConfig } from 'tsup';
import { version } from './package.json';

export default defineConfig({
  entry: ['src/index.ts', 'src/monitor.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  external: ['zod'],
  define: {
    __PACKAGE_VERSION__: JSON.stringify(version),
  },
});
