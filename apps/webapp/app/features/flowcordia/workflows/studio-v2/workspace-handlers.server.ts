import { json } from "@remix-run/node";
import { z } from "zod";
import { requireFlowcordiaProjectContext } from "~/features/flowcordia/proposals/scope.server";
import { canAccessFlowcordiaStudio } from "~/features/flowcordia/proposals/workspace/access.server";
import { resolveFlowcordiaCredentialEnvironment } from "~/features/flowcordia/workflows/credentials/query.server";
import { executeWorkflowStudioCommand } from "~/features/flowcordia/workflows/studio/commands.server";
import {
  StudioV2ActivepiecesApiError,
  handleStudioV2ActivepiecesApi,
} from "~/features/flowcordia/workflows/studio-v2/activepieces-api.server";
import { handleStudioV2ActivepiecesExtendedApi } from "~/features/flowcordia/workflows/studio-v2/activepieces-extended-api.server";
import { handleStudioV2ActivepiecesTriggerTesting } from "~/features/flowcordia/workflows/studio-v2/activepieces-trigger-testing.server";
import { StudioV2ReleaseError } from "~/features/flowcordia/workflows/studio-v2/release-contract";
import {
  deployStudioV2Release,
  listStudioV2ReleaseHistory,
  loadCurrentStudioV2Release,
  loadLatestStudioV2Release,
  rollbackStudioV2Release,
  stageStudioV2Workspace,
} from "~/features/flowcordia/workflows/studio-v2/release-service.server";
import {
  StudioV2RepositoryError,
  loadExactStudioV2RepositoryWorkflow,
  pullStudioV2RepositoryWorkflow,
  pushStudioV2RepositoryWorkflow,
  queryStudioV2Repository,
} from "~/features/flowcordia/workflows/studio-v2/repository-service.server";
import {
  StudioV2SourceTestError,
  executeStudioV2SourceTest,
} from "~/features/flowcordia/workflows/studio-v2/source-test.server";
import { generateStudioV2WorkflowSource } from "~/features/flowcordia/workflows/studio-v2/source/generated-source.server";
import { StudioV2WorkflowSourceError } from "~/features/flowcordia/workflows/studio-v2/source/workflow-source.server";
import {
  STUDIO_V2_WORKSPACE_KEY_PATTERN,
  StudioV2WorkspaceError,
  type StudioV2WorkspaceScope,
} from "~/features/flowcordia/workflows/studio-v2/workspace-contract";
import {
  queryStudioV2WorkflowCatalog,
  studioV2WorkspaceKeyForWorkflow,
} from "~/features/flowcordia/workflows/studio-v2/workflow-catalog.server";
import {
  StudioV2WorkspaceCommandError,
  parseStudioV2WorkspaceCommand,
  type StudioV2WorkspaceActionData,
  type StudioV2WorkspaceCommand,
} from "~/features/flowcordia/workflows/studio-v2/workspace-http";
import {
  loadOrCreateStudioV2Workspace,
  saveStudioV2Workspace,
} from "~/features/flowcordia/workflows/studio-v2/workspace-service.server";
import {
  StudioV2WorkflowTestError,
  cancelStudioV2WorkflowTest,
  readStudioV2WorkflowTest,
  startStudioV2WorkflowTest,
} from "~/features/flowcordia/workflows/studio-v2/workflow-test.server";

import type { RbacAbility } from "@trigger.dev/rbac";
import type { SessionUser } from "~/services/routeBuilders/dashboardBuilder";
import type { FlowcordiaProjectContext } from "~/features/flowcordia/proposals/scope.server";

export type StudioV2Request = {
  context: FlowcordiaProjectContext;
  params: { organizationSlug: string; projectParam: string; envParam: string };
  searchParams: z.infer<typeof StudioV2Search>;
  request: Request;
  user: Pick<SessionUser, "id" | "admin" | "isImpersonating">;
  ability: RbacAbility;
};

export const StudioV2Search = z.object({
  workflow: z
    .string()
    .regex(/^[a-z][a-z0-9_-]{2,127}$/)
    .optional(),
  view: z.enum(["editor", "source"]).optional(),
  _studioWorkspace: z.string().regex(STUDIO_V2_WORKSPACE_KEY_PATTERN).optional(),
  _data: z.string().optional(),
});

function workspaceScope(input: {
  organizationId: string;
  projectId: string;
  environmentId: string;
  workspaceKey: string;
}): StudioV2WorkspaceScope {
  return input;
}

async function assertStudioAccess(input: {
  userId: string;
  isAdmin: boolean;
  isImpersonating: boolean;
  organizationSlug: string;
}): Promise<void> {
  const enabled = await canAccessFlowcordiaStudio(input);
  if (!enabled) throw new Response("Not found", { status: 404 });
}

async function readWorkspaceCommand(request: Request): Promise<StudioV2WorkspaceCommand> {
  try {
    return parseStudioV2WorkspaceCommand(await request.json());
  } catch (error) {
    if (error instanceof StudioV2WorkspaceCommandError) throw error;
    throw new StudioV2WorkspaceCommandError(
      "The Studio V2 workspace command body must contain valid JSON."
    );
  }
}

export async function loadStudioV2({
  context,
  params,
  searchParams,
  user,
  ability,
}: StudioV2Request) {
  await assertStudioAccess({
    userId: user.id,
    isAdmin: user.admin,
    isImpersonating: user.isImpersonating,
    organizationSlug: params.organizationSlug,
  });

  const { organizationId, projectId } = requireFlowcordiaProjectContext(context);
  const environment = await resolveFlowcordiaCredentialEnvironment({
    projectId,
    environmentSlug: params.envParam,
  });
  if (!environment) throw new Response("Environment not found", { status: 404 });

  const catalog = await queryStudioV2WorkflowCatalog({
    organizationId,
    projectId,
    environmentId: environment.id,
  });
  const selectedWorkflow = searchParams._studioWorkspace
    ? (catalog.workflows.find(
        (workflow) => workflow.workspaceKey === searchParams._studioWorkspace
      ) ?? null)
    : searchParams.workflow
      ? (catalog.workflows.find((workflow) => workflow.workflowId === searchParams.workflow) ??
        null)
      : null;
  const selectedWorkflowId = selectedWorkflow?.workflowId ?? null;
  const canWrite = ability.can("write", { type: "envvars", envType: environment.type });

  if (!selectedWorkflow) {
    return json({
      workspace: null,
      projectId,
      workflows: catalog.workflows,
      workflowCatalogError: catalog.error,
      selectedWorkflow: null,
      selectedWorkflowId: null,
      selectedWorkspaceKey: null,
      latestRelease: null,
      currentRelease: null,
      releaseHistory: [],
      repository: null,
      generatedSource: null,
      canWrite,
    });
  }

  const workspaceKey = selectedWorkflow.workspaceKey;
  const scope = workspaceScope({
    organizationId,
    projectId,
    environmentId: environment.id,
    workspaceKey,
  });
  const initialDocument = selectedWorkflow.sourceCommitSha
    ? await loadExactStudioV2RepositoryWorkflow({
        organizationId,
        projectId,
        workflowId: selectedWorkflow.workflowId,
      })
    : undefined;
  const workspace = await loadOrCreateStudioV2Workspace({
    scope,
    actorId: user.id,
    initialDocument,
  });
  const generatedSource = generateStudioV2WorkflowSource({
    document: workspace.document,
    documentSha256: workspace.documentSha256,
  });
  const [latestRelease, currentRelease, releaseHistory, repository] = await Promise.all([
    loadLatestStudioV2Release(scope),
    loadCurrentStudioV2Release(scope),
    listStudioV2ReleaseHistory(scope),
    selectedWorkflow.sourceCommitSha
      ? queryStudioV2Repository({
          organizationId,
          projectId,
          workflowId: selectedWorkflow.workflowId,
          localDocumentSha256: workspace.documentSha256,
        })
      : null,
  ]);

  return json({
    workspace,
    projectId,
    workflows: catalog.workflows,
    workflowCatalogError: catalog.error,
    selectedWorkflow,
    selectedWorkflowId,
    selectedWorkspaceKey: workspaceKey,
    latestRelease,
    currentRelease,
    releaseHistory,
    repository,
    generatedSource,
    canWrite,
  });
}

function workspaceErrorResponse(error: unknown): Response {
  if (error instanceof StudioV2WorkspaceCommandError) {
    return json<StudioV2WorkspaceActionData>(
      { ok: false, code: "invalid_command", message: error.message },
      { status: 400 }
    );
  }
  if (error instanceof StudioV2ActivepiecesApiError) {
    return json<StudioV2WorkspaceActionData>(
      { ok: false, code: error.code, message: error.message },
      { status: error.status }
    );
  }
  if (error instanceof StudioV2WorkflowSourceError) {
    const location = error.line
      ? ` at line ${error.line}${error.column ? `:${error.column}` : ""}`
      : "";
    return json<StudioV2WorkspaceActionData>(
      { ok: false, code: "invalid_source", message: `${error.message}${location}` },
      { status: 400 }
    );
  }
  if (error instanceof StudioV2SourceTestError) {
    return json<StudioV2WorkspaceActionData>(
      { ok: false, code: error.code, message: error.message },
      { status: error.status }
    );
  }
  if (error instanceof StudioV2WorkflowTestError) {
    return json<StudioV2WorkspaceActionData>(
      { ok: false, code: error.code, message: error.message },
      { status: error.status }
    );
  }
  if (error instanceof StudioV2ReleaseError) {
    const status =
      error.code === "release_not_found"
        ? 404
        : error.code === "release_conflict"
          ? 409
          : error.code === "deployment_failed"
            ? 502
            : error.code === "corrupt_release"
              ? 500
              : 400;
    return json<StudioV2WorkspaceActionData>(
      { ok: false, code: error.code, message: error.message },
      { status }
    );
  }
  if (error instanceof StudioV2RepositoryError) {
    const status =
      error.code === "workflow_not_indexed" || error.code === "workspace_not_found"
        ? 404
        : error.code === "workspace_conflict" ||
            error.code === "stale_repository_source" ||
            error.code === "no_repository_changes"
          ? 409
          : error.retryable
            ? 503
            : 400;
    return json<StudioV2WorkspaceActionData>(
      { ok: false, code: error.code, message: error.message },
      { status }
    );
  }
  if (error instanceof StudioV2WorkspaceError) {
    const status =
      error.code === "workspace_not_found"
        ? 404
        : error.code === "workspace_conflict"
          ? 409
          : error.code === "corrupt_workspace"
            ? 500
            : 400;
    return json<StudioV2WorkspaceActionData>(
      { ok: false, code: error.code, message: error.message },
      { status }
    );
  }
  throw error;
}

export async function commandStudioV2({
  context,
  params,
  searchParams,
  request,
  user,
  ability,
}: StudioV2Request) {
  await assertStudioAccess({
    userId: user.id,
    isAdmin: user.admin,
    isImpersonating: user.isImpersonating,
    organizationSlug: params.organizationSlug,
  });

  const { organizationId, projectId } = requireFlowcordiaProjectContext(context);
  const environment = await resolveFlowcordiaCredentialEnvironment({
    projectId,
    environmentSlug: params.envParam,
  });
  if (!environment) throw new Response("Environment not found", { status: 404 });
  const canWrite = ability.can("write", { type: "envvars", envType: environment.type });
  const workspaceKey =
    searchParams._studioWorkspace ?? studioV2WorkspaceKeyForWorkflow(searchParams.workflow);

  try {
    const command = await readWorkspaceCommand(request);
    if (command.intent === "activepieces_api") {
      const triggerTesting = await handleStudioV2ActivepiecesTriggerTesting({
        command,
        organizationId,
        projectId,
        environmentId: environment.id,
        actorId: user.id,
        canWrite,
        workspaceKey,
      });
      if (triggerTesting.handled) {
        return json<StudioV2WorkspaceActionData>({
          ok: true,
          intent: "activepieces_api",
          data: triggerTesting.data,
        });
      }

      const extended = await handleStudioV2ActivepiecesExtendedApi({
        command,
        organizationId,
        projectId,
        environmentId: environment.id,
        actorId: user.id,
        canWrite,
        workspaceKey,
      });
      const data = extended.handled
        ? extended.data
        : await handleStudioV2ActivepiecesApi({
            command,
            organizationId,
            projectId,
            environmentId: environment.id,
            actorId: user.id,
            canWrite,
            workspaceKey,
          });
      return json<StudioV2WorkspaceActionData>({
        ok: true,
        intent: "activepieces_api",
        data,
        ...(extended.handled && extended.transport ? { transport: extended.transport } : {}),
      });
    }

    if (!canWrite) throw new Response("Forbidden", { status: 403 });

    if (command.intent === "repository_sync") {
      const response = await executeWorkflowStudioCommand({
        context,
        request: new Request(request.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation: "synchronize" }),
        }),
        userId: user.id,
      });
      const result = (await response.json()) as {
        ok: boolean;
        status?: string;
        commitSha?: string;
        entryCount?: number;
        validCount?: number;
        invalidCount?: number;
        error?: string;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        throw new StudioV2RepositoryError(
          "repository_unavailable",
          result.message ?? "Repository synchronization failed.",
          response.status >= 500
        );
      }
      return json<StudioV2WorkspaceActionData>({
        ok: true,
        intent: "repository_sync",
        status: result.status ?? "synchronized",
        commitSha: result.commitSha ?? "",
        entryCount: result.entryCount ?? 0,
        validCount: result.validCount ?? 0,
        invalidCount: result.invalidCount ?? 0,
      });
    }

    const scope = workspaceScope({
      organizationId,
      projectId,
      environmentId: environment.id,
      workspaceKey,
    });

    if (command.intent === "repository_pull" || command.intent === "repository_push") {
      if (!searchParams.workflow) {
        throw new StudioV2RepositoryError(
          "workflow_not_indexed",
          "Choose a repository workflow before using GitHub commands."
        );
      }
      const repositoryInput = {
        organizationId,
        projectId,
        workflowId: searchParams.workflow,
        workspaceScope: scope,
        expectedVersion: BigInt(command.expectedVersion),
        actorId: user.id,
      };
      if (command.intent === "repository_pull") {
        const pulled = await pullStudioV2RepositoryWorkflow(repositoryInput);
        return json<StudioV2WorkspaceActionData>({
          ok: true,
          intent: "repository_pull",
          ...pulled,
        });
      }
      const proposal = await pushStudioV2RepositoryWorkflow(repositoryInput);
      return json<StudioV2WorkspaceActionData>({
        ok: true,
        intent: "repository_push",
        proposal,
      });
    }

    if (command.intent === "deploy") {
      const release = await deployStudioV2Release({
        scope,
        releasePublicId: command.releasePublicId,
        actorId: user.id,
      });
      return json<StudioV2WorkspaceActionData>({ ok: true, intent: "deploy", release });
    }

    if (command.intent === "rollback") {
      const release = await rollbackStudioV2Release({
        scope,
        releasePublicId: command.releasePublicId,
        actorId: user.id,
      });
      return json<StudioV2WorkspaceActionData>({ ok: true, intent: "rollback", release });
    }

    const expectedVersion = BigInt(command.expectedVersion);
    if (command.intent === "source_save") {
      const current = await loadOrCreateStudioV2Workspace({ scope, actorId: user.id });
      const document = current.document as Record<string, unknown>;
      const metadata =
        document.metadata &&
        typeof document.metadata === "object" &&
        !Array.isArray(document.metadata)
          ? (document.metadata as Record<string, unknown>)
          : {};
      const workspace = await saveStudioV2Workspace({
        scope,
        expectedVersion,
        document: {
          ...document,
          metadata: { ...metadata, sourceProject: command.sourceProject },
        },
        actorId: user.id,
      });
      return json<StudioV2WorkspaceActionData>({
        ok: true,
        intent: "source_save",
        workspace,
      });
    }
    if (command.intent === "save") {
      const current = await loadOrCreateStudioV2Workspace({ scope, actorId: user.id });
      const currentDocument = current.document as Record<string, unknown>;
      const currentMetadata =
        currentDocument.metadata &&
        typeof currentDocument.metadata === "object" &&
        !Array.isArray(currentDocument.metadata)
          ? (currentDocument.metadata as Record<string, unknown>)
          : {};
      const currentSourceProject = currentMetadata.sourceProject;
      const nextDocument = command.document as Record<string, unknown>;
      const nextMetadata =
        nextDocument.metadata &&
        typeof nextDocument.metadata === "object" &&
        !Array.isArray(nextDocument.metadata)
          ? (nextDocument.metadata as Record<string, unknown>)
          : {};
      const workspace = await saveStudioV2Workspace({
        scope,
        expectedVersion,
        document: currentSourceProject
          ? {
              ...nextDocument,
              metadata: { ...nextMetadata, sourceProject: currentSourceProject },
            }
          : command.document,
        actorId: user.id,
      });
      return json<StudioV2WorkspaceActionData>({ ok: true, intent: "save", workspace });
    }

    if (command.intent === "source_test") {
      const sourceTest = await executeStudioV2SourceTest({
        scope,
        expectedVersion,
        actorId: user.id,
        testInput: command.input,
        retryFailedDeployment: command.retryFailedDeployment,
      });
      return json<StudioV2WorkspaceActionData>({
        ok: true,
        intent: "source_test",
        sourceTest,
      });
    }

    if (command.intent === "stage") {
      const release = await stageStudioV2Workspace({
        scope,
        expectedVersion,
        actorId: user.id,
      });
      return json<StudioV2WorkspaceActionData>({ ok: true, intent: "stage", release });
    }

    if (command.intent === "cancel_test") {
      const cancelled = await cancelStudioV2WorkflowTest({
        scope,
        expectedVersion,
        runId: command.runId,
      });
      return json<StudioV2WorkspaceActionData>({
        ok: true,
        intent: "cancel_test",
        runId: cancelled.runId,
      });
    }

    const test =
      command.intent === "test_status"
        ? await readStudioV2WorkflowTest({
            scope,
            expectedVersion,
            actorId: user.id,
            runId: command.runId,
          })
        : await startStudioV2WorkflowTest({
            scope,
            expectedVersion,
            actorId: user.id,
            testInput: command.input,
            retryFailedDeployment: command.retryFailedDeployment,
          });
    return json<StudioV2WorkspaceActionData>({
      ok: true,
      intent: "test",
      ...(test.status === "completed" ? { workspace: test.workspace } : {}),
      test:
        test.status === "completed"
          ? {
              status: "completed",
              runId: test.runId,
              success: test.success,
              execution: test.execution,
            }
          : test,
    });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
}
