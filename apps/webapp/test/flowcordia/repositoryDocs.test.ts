import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Flowcordia public repository foundation", () => {
  it("gives visitors working repository entrypoints", () => {
    const readme = read("README.md");
    expect(readme).toContain("# Flowcordia");
    expect(readme).toContain("Open-source workflow automation");
    expect(readme).toContain("Beta candidate, not a production guarantee");
    for (const path of [
      "CONTRIBUTING.md",
      "SUPPORT.md",
      "SECURITY.md",
      "CODE_OF_CONDUCT.md",
      "LICENSE",
      "THIRD_PARTY_NOTICES.md",
      "flowcordia/runbooks/open-source-beta.md",
      "flowcordia/runbooks/studio-api.md",
      "apps/webapp/public/brand/flowcordia-logo-black.svg",
      "apps/webapp/public/brand/flowcordia-logo-white.svg",
    ]) {
      expect(existsSync(resolve(root, path)), path).toBe(true);
      expect(readme, path).toContain(path);
    }
  });

  it("does not route contributions or sponsorship to the upstream project", () => {
    expect(existsSync(resolve(root, ".github/FUNDING.yml"))).toBe(false);
    for (const path of [".github/ISSUE_TEMPLATE/config.yml", ".github/pull_request_template.md"]) {
      expect(read(path)).not.toMatch(/triggerdotdev|trigger\.dev/);
    }
    expect(read("CONTRIBUTING.md")).toContain("/setup/owner");
  });

  it("makes inherited contributor restrictions explicitly opt-in", () => {
    for (const path of [
      ".github/workflows/vouch-check-pr.yml",
      ".github/workflows/vouch-manage-by-issue.yml",
    ]) {
      expect(read(path)).toContain("vars.FLOWCORDIA_VOUCH_ENABLED == '1'");
    }
  });

  it("asks reporters for a version and safe reproduction", () => {
    const form = read(".github/ISSUE_TEMPLATE/bug_report.yml");
    expect(form).toContain("id: version");
    expect(form).toContain("id: reproduction");
    expect(form).toContain("Never include tokens");
  });
});
