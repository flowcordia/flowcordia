import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "../../app");
const read = (path: string) => readFileSync(resolve(app, path), "utf8");

describe("Flowcordia public links and first-owner entry", () => {
  it("uses Flowcordia in dashboard page titles", () => {
    const routes = resolve(app, "routes");
    for (const entry of readdirSync(routes, { recursive: true, encoding: "utf8" })) {
      if (!entry.endsWith(".tsx")) continue;
      const source = readFileSync(resolve(routes, entry), "utf8");
      const titles = source.split("\n").filter((line) => /title:/.test(line));
      expect(titles.join("\n"), entry).not.toMatch(/Trigger\.dev|Activepieces/);
    }
  });

  it("removes the unrelated upstream launch promotion", () => {
    expect(existsSync(resolve(app, "components/ProductHuntBanner.tsx"))).toBe(false);
  });

  it("does not send local build references to an unrelated repository", () => {
    const source = read("components/navigation/OrganizationSettingsSideMenu.tsx");
    expect(source).toContain("buildInfo.gitRefName");
    expect(source).toContain("buildInfo.gitSha.slice(0, 9)");
    expect(source).not.toContain("github.com/triggerdotdev/trigger.dev");
  });

  it("brands the connection status without renaming the working CLI", () => {
    const source = read("components/DevPresence.tsx");
    expect(source).toContain("Your local dev server is connected to Flowcordia");
    expect(source).toContain("Your local dev server is not connected to Flowcordia");
    expect(source).not.toContain("connected to Trigger.dev");
  });

  it.each(["login._index", "login.magic", "setup_.owner"])(
    "uses Flowcordia legal pages in %s",
    (route) => {
      const source = read(`routes/${route}/route.tsx`);
      expect(source).toContain('href="https://flowcordia.com/terms"');
      expect(source).toContain('href="https://flowcordia.com/privacy"');
      expect(source).not.toMatch(/https:\/\/trigger\.dev\/(legal|terms|privacy)/);
    }
  );

  it("keeps public help destinations on Flowcordia", () => {
    const source = read("components/navigation/HelpAndFeedbackPopover.tsx");
    for (const page of ["docs", "status", "feedback", "changelog"]) {
      expect(source).toContain(`https://flowcordia.com/${page}`);
    }
    expect(source).not.toContain("entry.actionUrl");
  });

  it("redirects both magic-link entrypoints to setup on an unclaimed installation", () => {
    const source = read("routes/login.magic/route.tsx");
    expect(source.match(/isFirstOwnerClaimOpen\(await getFirstOwnerState\(\)\)/g)).toHaveLength(2);
    expect(source).toContain('redirect("/setup/owner")');
  });
});
