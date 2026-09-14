import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Studio native builder packaging", () => {
  const dockerfile = readFileSync(resolve(process.cwd(), "../../docker/Dockerfile"), "utf8");
  it.each(["cli-v3", "core", "build", "schema-to-json"])(
    "includes the compiled %s runtime",
    (name) => {
      expect(dockerfile).toContain(`/triggerdotdev/packages/${name}/dist ./packages/${name}/dist`);
    }
  );
  it("checks that the packaged CLI starts before publishing an image", () => {
    expect(dockerfile).toContain("RUN node ./packages/cli-v3/dist/esm/index.js --version");
  });
});
