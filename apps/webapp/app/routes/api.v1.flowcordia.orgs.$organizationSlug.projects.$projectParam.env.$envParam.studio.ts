import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "~/db.server";
import { resolveFlowcordiaProjectContext } from "~/features/flowcordia/proposals/scope.server";
import { resolveFlowcordiaCredentialEnvironment } from "~/features/flowcordia/workflows/credentials/query.server";
import {
  commandStudioV2,
  loadStudioV2,
  StudioV2Search,
} from "~/features/flowcordia/workflows/studio-v2/workspace-handlers.server";
import { logger } from "~/services/logger.server";
import { updateLastAccessedAtIfStale } from "~/services/personalAccessToken.server";
import { rbac } from "~/services/rbac.server";
import { EnvironmentParamSchema } from "~/utils/pathBuilder";

async function handle({ request, params }: LoaderFunctionArgs | ActionFunctionArgs) {
  try {
    if (request.method !== "GET" && request.method !== "POST") {
      return json(
        { ok: false, code: "method_not_allowed" },
        { status: 405, headers: { Allow: "GET, POST" } }
      );
    }
    const parsed = EnvironmentParamSchema.safeParse(params);
    const search = StudioV2Search.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success || !search.success) {
      return json({ ok: false, code: "invalid_parameters" }, { status: 400 });
    }
    const context = await resolveFlowcordiaProjectContext(parsed.data);
    const auth = await rbac.authenticatePat(request, context);
    if (!auth.ok) return json({ ok: false, code: "unauthorized" }, { status: auth.status });
    if (!context.projectFound) return json({ ok: false, code: "not_found" }, { status: 404 });

    // The OSS PAT authenticator validates the token but does not enforce tenant membership.
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, admin: true },
    });
    const membership = await prisma.orgMember.findUnique({
      where: {
        organizationId_userId: { organizationId: context.organizationId, userId: auth.userId },
      },
      select: { id: true },
    });
    if (!user || !membership) return json({ ok: false, code: "not_found" }, { status: 404 });
    const environment = await resolveFlowcordiaCredentialEnvironment({
      projectId: context.projectId,
      environmentSlug: parsed.data.envParam,
    });
    if (!environment) return json({ ok: false, code: "not_found" }, { status: 404 });
    if (!auth.ability.can("read", { type: "envvars", envType: environment.type })) {
      return json({ ok: false, code: "forbidden" }, { status: 403 });
    }
    await updateLastAccessedAtIfStale(auth.tokenId, auth.lastAccessedAt);
    const input = {
      context,
      params: parsed.data,
      searchParams: search.data,
      request,
      user: { ...user, isImpersonating: false },
      ability: auth.ability,
    };
    const response =
      request.method === "GET" ? await loadStudioV2(input) : await commandStudioV2(input);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof Response) {
      return json(
        { ok: false, code: error.status === 403 ? "forbidden" : "request_failed" },
        { status: error.status }
      );
    }
    logger.error("Studio API request failed", { error });
    return json(
      { ok: false, code: "internal_error", message: "The Studio request could not be completed." },
      { status: 500 }
    );
  }
}

export const loader = handle;
export const action = handle;
