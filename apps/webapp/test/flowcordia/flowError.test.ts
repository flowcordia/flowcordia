import { describe, expect, it } from "vitest";
import { flowErrorDisplay } from "../../app/utils/flowError";

describe("FlowError recovery", () => {
  it.each([
    new TypeError("private implementation detail"),
    null,
    undefined,
    "unexpected",
    { message: { nested: true } },
  ])("provides a recoverable display for unexpected errors", (error) => {
    expect(flowErrorDisplay(error)).toMatchObject({
      title: "FlowError",
      status: 500,
      retryable: true,
    });
    expect(JSON.stringify(flowErrorDisplay(error))).not.toContain("private implementation detail");
  });

  it.each([null, undefined, "Not found", { message: { invalid: true } }])(
    "handles missing or non-renderable response data without crashing",
    (data) => {
      expect(
        flowErrorDisplay({ status: 404, statusText: "Not Found", internal: false, data })
      ).toMatchObject({ status: 404, title: "This page isn't here", retryable: false });
    }
  );

  it("does not display server exception payloads", () => {
    const display = flowErrorDisplay({
      status: 500,
      statusText: "Server token=private",
      internal: false,
      data: { message: "postgres://private" },
    });
    expect(JSON.stringify(display)).not.toContain("private");
  });

  it("distinguishes authentication from retryable errors", () => {
    const response = (status: number) => ({ status, statusText: "", internal: false, data: null });
    expect(flowErrorDisplay(response(401))).toMatchObject({ signIn: true, retryable: false });
    expect(flowErrorDisplay(response(403))).toMatchObject({ signIn: false, retryable: false });
    expect(flowErrorDisplay(response(409))).toMatchObject({ retryable: true });
    expect(flowErrorDisplay(response(429))).toMatchObject({ retryable: true });
  });
});
