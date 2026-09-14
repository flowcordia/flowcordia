import { defineConfig } from "vitest/config";
import { DurationShardingSequencer } from "@internal/testcontainers/sequencer";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    sequence: { sequencer: DurationShardingSequencer },
    include: ["test/**/*.test.ts", "app/features/flowcordia/**/*.test.ts"],
    // *.e2e.test.ts: smoke matrix, run via vitest.e2e.config.ts.
    // *.e2e.full.test.ts: full auth suite, runs via vitest.e2e.full.config.ts
    // (needs a globalSetup-spawned webapp + Postgres container).
    exclude: ["test/**/*.e2e.test.ts", "test/**/*.e2e.full.test.ts"],
    globals: true,
    pool: "forks",
    setupFiles: ["./test/setup.ts"], // load apps/webapp/.env
  },
  plugins: [
    // @ts-expect-error vite-tsconfig-paths and Vitest resolve different Vite plugin types.
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    {
      name: "test-cli-modules",
      enforce: "pre",
      transform(code, id) {
        // CLI entrypoints are also imported as libraries by the self-host tests.
        if (id.endsWith(".mjs") && code.startsWith("#!")) {
          return { code: code.slice(code.indexOf("\n") + 1), map: null };
        }
      },
    },
  ],
});
