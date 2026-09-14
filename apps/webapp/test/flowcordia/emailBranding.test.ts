import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import MagicLinkEmail from "../../../../internal-packages/emails/emails/magic-link";
import WelcomeEmail from "../../../../internal-packages/emails/emails/welcome";

describe("Flowcordia email identity", () => {
  it("preserves the actual sign-in URL and renders Flowcordia branding", () => {
    const magicLink = "https://selfhost.example/magic?token=example-token";
    const html = renderToStaticMarkup(createElement(MagicLinkEmail, { magicLink }));
    expect(html).toContain(`href="${magicLink}"`);
    expect(html).toContain("Log in to Flowcordia");
    expect(html).toContain("https://flowcordia.com/privacy");
    expect(html).not.toMatch(/trigger\.dev|triggerdotdev|logo-mono\.png/i);
  });

  it("does not impersonate an upstream founder or link to their services", () => {
    const html = renderToStaticMarkup(createElement(WelcomeEmail, { name: "Alex" }));
    expect(html).toContain("Alex");
    expect(html).toContain("Welcome to Flowcordia");
    expect(html).toContain("https://flowcordia.com/docs");
    expect(html).not.toMatch(/Trigger\.dev|Matt|CEO|cal\.com|discord\.gg|Dover/);
  });

  it("brands security email subjects without changing template identifiers", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../../internal-packages/emails/src/index.tsx"),
      "utf8"
    );
    expect(source).toContain('subject: "Magic sign-in link for Flowcordia"');
    expect(source).toContain('case "magic_link"');
    expect(source).not.toContain("Trigger.dev");
  });
});
