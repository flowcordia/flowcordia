import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFlowcordiaActivepiecesStore } from "./activepieces-store.js";

describe("Activepieces store transport", () => {
  let server: Server;
  let apiUrl: string;
  const values = new Map<string, unknown>();
  beforeAll(async () => {
    server = createServer(async (request, response) => {
      if (request.headers.authorization !== "Bearer test-runtime-token") {
        response.writeHead(401).end();
        return;
      }
      const key = new URL(request.url!, "http://localhost").searchParams.get("key")!;
      if (request.method === "POST") {
        let body = "";
        for await (const chunk of request) body += chunk;
        const parsed = JSON.parse(body);
        if (parsed.key !== key) {
          response.writeHead(400).end();
          return;
        }
        values.set(key, parsed.value);
      }
      if (request.method === "DELETE") {
        values.delete(key);
        response.end("{}");
        return;
      }
      if (!values.has(key)) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ value: values.get(key) }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    apiUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });
  it("persists values across clients and deletes them", async () => {
    const input = { flowId: "flow_a", apiUrl, token: "test-runtime-token" };
    const first = createFlowcordiaActivepiecesStore(input);
    const second = createFlowcordiaActivepiecesStore(input);
    await first.put("result", { total: 11 });
    expect(await second.get("result")).toEqual({ total: 11 });
    await second.delete("result");
    expect(await first.get("result")).toBeNull();
  });
  it("isolates flow keys while sharing explicitly project-scoped keys", async () => {
    const a = createFlowcordiaActivepiecesStore({
      flowId: "a",
      apiUrl,
      token: "test-runtime-token",
    });
    const b = createFlowcordiaActivepiecesStore({
      flowId: "b",
      apiUrl,
      token: "test-runtime-token",
    });
    await a.put("private", "a");
    expect(await b.get("private")).toBeNull();
    await a.put("shared", "project", "COLLECTION");
    expect(await b.get("shared", "COLLECTION")).toBe("project");
    expect(await b.get("shared", "PROJECT")).toBe("project");
  });
  it("reports authentication failures without leaking credentials", async () => {
    const store = createFlowcordiaActivepiecesStore({
      flowId: "a",
      apiUrl,
      token: "wrong-private-token",
    });
    await expect(store.get("key")).rejects.toThrow("Store request failed with HTTP 401.");
  });
  it("validates the scoped key before making a request", async () => {
    const store = createFlowcordiaActivepiecesStore({
      flowId: "a",
      apiUrl,
      token: "test-runtime-token",
    });
    await expect(store.get("x".repeat(128))).rejects.toThrow("scoped Store key");
    await expect(store.put("x".repeat(128), "ok", "PROJECT")).resolves.toBe("ok");
  });
});
