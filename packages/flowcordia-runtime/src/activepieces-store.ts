import type { FlowcordiaActivepiecesStoreService } from "./activepieces.js";

export function createFlowcordiaActivepiecesStore(input: {
  flowId: string;
  apiUrl?: string;
  token?: string;
  fetch?: typeof globalThis.fetch;
}): FlowcordiaActivepiecesStoreService {
  async function request(
    method: "GET" | "POST" | "DELETE",
    key: string,
    scope?: string,
    value?: unknown
  ) {
    if (!input.apiUrl || !input.token)
      throw new Error("Store requires the Trigger.dev runtime API credentials.");
    if (!key || key.length > 128)
      throw new Error("Store key must contain between 1 and 128 characters.");
    const storeKey =
      scope === "COLLECTION" || scope === "PROJECT" ? key : `flow_${input.flowId}/${key}`;
    if (storeKey.length > 128)
      throw new Error("The scoped Store key exceeds the 128 character limit.");
    const url = new URL("/api/v1/flowcordia/activepieces/store-entries", input.apiUrl);
    url.searchParams.set("key", storeKey);
    const response = await (input.fetch ?? globalThis.fetch)(url, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${input.token}`, "content-type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify({ key: storeKey, value }) } : {}),
    });
    if (method === "GET" && response.status === 404) return null;
    if (!response.ok) throw new Error(`Store request failed with HTTP ${response.status}.`);
    if (method === "DELETE") return null;
    return ((await response.json()) as { value?: unknown }).value ?? null;
  }
  return {
    get: (key, scope) => request("GET", key, scope),
    put: (key, value, scope) => request("POST", key, scope, value),
    delete: async (key, scope) => {
      await request("DELETE", key, scope);
    },
  };
}
