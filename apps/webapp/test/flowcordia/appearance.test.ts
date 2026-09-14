import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// Use the same CSS parser as the existing Tailwind toolchain.
const require = createRequire(import.meta.url);
const { parse } = createRequire(require.resolve("tailwindcss"))("postcss");
const stylesheet = parse(readFileSync(resolve(process.cwd(), "app/flowcordia-theme.css"), "utf8"));

function tokensFor(selector: string) {
  const tokens: Record<string, number[]> = {};
  stylesheet.walkRules(
    selector,
    (rule: {
      walkDecls: (
        pattern: RegExp,
        visit: (declaration: { prop: string; value: string }) => void
      ) => void;
    }) => {
      rule.walkDecls(/^--fc-/, (declaration) => {
        tokens[declaration.prop] = declaration.value.split(/\s+/).map(Number);
      });
    }
  );
  return tokens;
}

function luminance(rgb: number[]) {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe.each([":root", ':root[data-appearance="dark"]'])(
  "Flowcordia appearance %s",
  (selector) => {
    const tokens = tokensFor(selector);

    it("defines the same complete palette in both appearances", () => {
      expect(Object.keys(tokens).sort()).toEqual(Object.keys(tokensFor(":root")).sort());
      for (const rgb of Object.values(tokens)) {
        expect(rgb).toHaveLength(3);
        expect(
          rgb.every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255)
        ).toBe(true);
      }
    });

    it.each(["200", "400", "workflows", "runs", "connections", "success", "warning", "preview"])(
      "keeps %s text readable on both main surfaces",
      (foreground) => {
        for (const background of ["800", "850"]) {
          const first = luminance(tokens[`--fc-${foreground}`]);
          const second = luminance(tokens[`--fc-${background}`]);
          const contrast = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
          expect(contrast).toBeGreaterThanOrEqual(4.5);
        }
      }
    );

    it("keeps primary action labels readable", () => {
      const first = luminance(tokens["--fc-primary"]);
      const second = luminance(tokens["--fc-on-primary"]);
      expect(
        (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
);
