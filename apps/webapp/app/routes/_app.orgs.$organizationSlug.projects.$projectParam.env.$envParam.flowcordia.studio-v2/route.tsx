import type { MetaFunction } from "@remix-run/node";
import {
  useLoaderData,
  useRevalidator,
  useSearchParams,
  type ShouldRevalidateFunctionArgs,
} from "@remix-run/react";
import { ArrowLeftIcon, Code2Icon, WorkflowIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, LinkButton } from "~/components/primitives/Buttons";
import { resolveFlowcordiaProjectContext } from "~/features/flowcordia/proposals/scope.server";
import { StudioV2BuilderHost } from "~/features/flowcordia/workflows/studio-v2/StudioV2BuilderHost";
import { StudioV2LifecycleBar } from "~/features/flowcordia/workflows/studio-v2/StudioV2LifecycleBar";
import { StudioV2WorkflowLibrary } from "~/features/flowcordia/workflows/studio-v2/StudioV2WorkflowLibrary";
import { StudioV2SourceSurface } from "~/features/flowcordia/workflows/studio-v2/source/StudioV2SourceSurface";
import {
  hasInvalidStudioV2View,
  isStudioV2ViewOnlyNavigation,
  normalizeStudioV2ViewSearchParams,
  resolveStudioV2View,
  studioV2SearchParamsForView,
} from "~/features/flowcordia/workflows/studio-v2/source/view-state";
import {
  StudioV2Search,
  loadStudioV2,
  commandStudioV2,
} from "~/features/flowcordia/workflows/studio-v2/workspace-handlers.server";
import { dashboardAction, dashboardLoader } from "~/services/routeBuilders/dashboardBuilder";
import { EnvironmentParamSchema } from "~/utils/pathBuilder";

export const meta: MetaFunction = () => [{ title: "Studio | Flowcordia" }];

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (isStudioV2ViewOnlyNavigation(currentUrl, nextUrl)) return false;
  return defaultShouldRevalidate;
}

const options = {
  params: EnvironmentParamSchema,
  searchParams: StudioV2Search,
  context: resolveFlowcordiaProjectContext,
};

export const loader = dashboardLoader(options, loadStudioV2);
export const action = dashboardAction(options, commandStudioV2);

export default function FlowcordiaStudioV2Route() {
  const data = useLoaderData<typeof loader>();
  const [workspace, setWorkspace] = useState(data.workspace);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string>();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const studioView = resolveStudioV2View(searchParams);
  const [sourceMounted, setSourceMounted] = useState(studioView === "source");
  const handleWorkspaceChange = useCallback(
    (nextWorkspace: NonNullable<typeof data.workspace>) => {
      setWorkspace(nextWorkspace);
      setEditorError(undefined);
      revalidator.revalidate();
    },
    [revalidator]
  );
  const handleEditorError = useCallback(
    (message: string) => {
      setEditorError(message);
      revalidator.revalidate();
    },
    [revalidator]
  );

  useEffect(() => {
    if (studioView === "source") setSourceMounted(true);
  }, [studioView]);

  useEffect(() => {
    setWorkspace(data.workspace);
  }, [data.workspace]);

  useEffect(() => {
    if (!workspace || editorSaving || studioView !== "editor") return;
    const interval = window.setInterval(() => revalidator.revalidate(), 15_000);
    return () => window.clearInterval(interval);
  }, [editorSaving, revalidator, studioView, workspace]);

  useEffect(() => {
    if (!hasInvalidStudioV2View(searchParams)) return;
    setSearchParams(normalizeStudioV2ViewSearchParams(searchParams), { replace: true });
  }, [searchParams, setSearchParams]);

  const handleStudioViewChange = useCallback(
    (nextView: string) => {
      const view = nextView === "source" ? "source" : "editor";
      setSearchParams((current) => studioV2SearchParamsForView(current, view), {
        preventScrollReset: true,
      });
    },
    [setSearchParams]
  );

  const studioShellAttributes = {
    "data-testid": "flowcordia-studio-v2-preview-route",
    "data-source-control": "optional",
    "data-source-editor-foundation": "sandpack",
    "data-persistence": "durable-local",
    "data-studio-foundation": "activepieces",
  } as const;

  if (!workspace || !data.selectedWorkflow || !data.selectedWorkspaceKey) {
    return (
      <div
        {...studioShellAttributes}
        data-studio-view="library"
        className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
      >
        <StudioV2WorkflowLibrary
          workflows={data.workflows}
          catalogError={data.workflowCatalogError}
          canWrite={data.canWrite}
        />
      </div>
    );
  }

  return (
    <div
      {...studioShellAttributes}
      data-studio-view={studioView}
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
    >
      <div className="h-11 shrink-0 overflow-x-auto border-b border-grid-dimmed bg-background-bright">
        <div className="flex h-full min-w-max items-center gap-2 px-2">
          <LinkButton variant="minimal/small" to="." LeadingIcon={ArrowLeftIcon}>
            Workflows
          </LinkButton>
          <div className="h-4 w-px shrink-0 bg-grid-bright" />
          <span
            className="w-40 truncate text-xs font-medium text-text-bright xl:w-64"
            title={data.selectedWorkflow.name}
          >
            {data.selectedWorkflow.name}
          </span>
          <div
            className="flex h-8 shrink-0 items-center gap-0.5 rounded-sm border border-grid-bright bg-background p-0.5"
            aria-label="Studio view"
          >
            <Button
              type="button"
              variant={studioView === "editor" ? "secondary/small" : "minimal/small"}
              LeadingIcon={WorkflowIcon}
              aria-pressed={studioView === "editor"}
              onClick={() => handleStudioViewChange("editor")}
            >
              Editor
            </Button>
            <Button
              type="button"
              variant={studioView === "source" ? "secondary/small" : "minimal/small"}
              LeadingIcon={Code2Icon}
              aria-pressed={studioView === "source"}
              disabled={studioView === "editor" && editorSaving}
              onClick={() => handleStudioViewChange("source")}
            >
              Source
            </Button>
          </div>
          <div className="min-w-4 flex-1" />
          {editorError ? (
            <span className="max-w-72 truncate text-xxs text-rose-500" role="alert">
              {editorError}
            </span>
          ) : null}
          {studioView === "editor" ? (
            <StudioV2LifecycleBar
              workspace={workspace}
              initialRelease={data.latestRelease}
              initialCurrentRelease={data.currentRelease}
              releaseHistory={data.releaseHistory}
              initialRepository={data.repository}
              canWrite={data.canWrite}
              editorSaving={editorSaving}
              onWorkspaceChange={handleWorkspaceChange}
            />
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          data-studio-v2-view="editor"
          aria-hidden={studioView !== "editor"}
          hidden={studioView !== "editor"}
          className="absolute inset-0"
        >
          <StudioV2BuilderHost
            workspace={workspace}
            projectId={data.projectId}
            canWrite={data.canWrite}
            active={studioView === "editor"}
            onSavingChange={setEditorSaving}
            onError={handleEditorError}
            onWorkspaceChange={handleWorkspaceChange}
          />
        </div>

        {sourceMounted ? (
          <div
            data-studio-v2-view="source"
            aria-hidden={studioView !== "source"}
            hidden={studioView !== "source"}
            className="absolute inset-0"
          >
            <StudioV2SourceSurface
              studioWorkspace={workspace}
              generatedSource={data.generatedSource}
              readOnly={!data.canWrite}
              onStudioWorkspaceChange={handleWorkspaceChange}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
