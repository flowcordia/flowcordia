import { useFetcher, useRevalidator } from "@remix-run/react";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  Code2Icon,
  GitBranchIcon,
  HardDriveIcon,
  PlugIcon,
  RefreshCwIcon,
  SearchIcon,
  WorkflowIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageBody, PageContainer } from "~/components/layout/AppLayout";
import { LinkButton, Button } from "~/components/primitives/Buttons";
import { NavBar, PageAccessories, PageTitle } from "~/components/primitives/PageHeader";
import { Paragraph } from "~/components/primitives/Paragraph";
import { useEnvironment } from "~/hooks/useEnvironment";
import { useOrganization } from "~/hooks/useOrganizations";
import { useProject } from "~/hooks/useProject";
import { v3ProjectSettingsIntegrationsPath } from "~/utils/pathBuilder";
import type { StudioV2WorkflowCatalogItem } from "./workflow-catalog.server";
import type { StudioV2WorkspaceActionData } from "./workspace-http";

function workflowHref(workflow: StudioV2WorkflowCatalogItem, view: "editor" | "source"): string {
  const search = new URLSearchParams({
    workflow: workflow.workflowId,
    _studioWorkspace: workflow.workspaceKey,
  });
  if (view === "source") search.set("view", "source");
  return `?${search.toString()}`;
}

export function StudioV2WorkflowLibrary({
  workflows,
  catalogError,
  canWrite,
}: {
  workflows: StudioV2WorkflowCatalogItem[];
  catalogError: string | null;
  canWrite: boolean;
}) {
  const revalidator = useRevalidator();
  const [search, setSearch] = useState("");
  const visibleWorkflows = workflows.filter((workflow) =>
    `${workflow.name} ${workflow.workflowId} ${workflow.description ?? ""}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase())
  );
  const syncFetcher = useFetcher<StudioV2WorkspaceActionData>();
  const synchronizedCommit = useRef<string | null>(null);
  const organization = useOrganization();
  const project = useProject();
  const environment = useEnvironment();
  const integrationsPath = v3ProjectSettingsIntegrationsPath(organization, project, environment);
  const repositorySetupPath = `/orgs/${organization.slug}/settings/flowcordia-setup`;
  const syncResult = syncFetcher.data;
  const syncMessage =
    syncResult && !syncResult.ok
      ? syncResult.message
      : syncResult?.ok && syncResult.intent === "repository_sync"
        ? `${syncResult.validCount} workflow${syncResult.validCount === 1 ? "" : "s"} synchronized.`
        : null;

  useEffect(() => {
    if (!syncResult?.ok || syncResult.intent !== "repository_sync") return;
    if (synchronizedCommit.current === syncResult.commitSha) return;
    synchronizedCommit.current = syncResult.commitSha;
    revalidator.revalidate();
  }, [revalidator, syncResult]);

  const synchronize = useCallback(() => {
    syncFetcher.submit(
      { intent: "repository_sync" },
      { method: "post", encType: "application/json" }
    );
  }, [syncFetcher]);

  return (
    <PageContainer>
      <NavBar>
        <PageTitle title="Workflows" />
        <PageAccessories>
          <LinkButton variant="minimal/small" to={integrationsPath} LeadingIcon={PlugIcon}>
            Connections
          </LinkButton>
          <Button
            type="button"
            variant="minimal/small"
            LeadingIcon={RefreshCwIcon}
            disabled={!canWrite}
            isLoading={syncFetcher.state !== "idle"}
            onClick={synchronize}
          >
            Sync
          </Button>
        </PageAccessories>
      </NavBar>

      <PageBody scrollable className="flowcordia-library bg-background-dimmed !p-0">
        <main className="mx-auto flex min-h-full w-full max-w-[80rem] flex-col px-5 py-8 sm:px-10 sm:py-12 lg:px-14">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-workflows">
                <WorkflowIcon className="size-4" /> Studio
              </div>
              <h1 className="text-[28px] font-semibold leading-tight text-text-bright">
                Your workflows
              </h1>
              <Paragraph variant="small/dimmed" className="mt-1">
                {project.name}
              </Paragraph>
              {syncMessage ? (
                <Paragraph
                  role="status"
                  variant="extra-small/dimmed"
                  className={syncResult && !syncResult.ok ? "mt-1 text-rose-500" : "mt-1"}
                >
                  {syncMessage}
                </Paragraph>
              ) : null}
            </div>
            <LinkButton
              variant="secondary/medium"
              to={integrationsPath}
              LeadingIcon={GitBranchIcon}
            >
              Repository
            </LinkButton>
          </div>

          {workflows.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-grid-bright pb-4">
              <span className="text-sm font-medium text-text-bright">
                All workflows <span className="ml-2 text-text-dimmed">{workflows.length}</span>
              </span>
              <label className="flex h-9 w-full items-center gap-2 rounded-md border border-grid-bright bg-background-dimmed px-3 focus-within:border-text-link sm:w-64">
                <SearchIcon className="size-4 shrink-0 text-text-dimmed" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search workflows"
                  placeholder="Search workflows"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-text-bright placeholder:text-text-dimmed focus:ring-0"
                />
              </label>
            </div>
          )}

          {catalogError && workflows.length > 0 && (
            <p role="alert" className="mb-4 text-sm text-error">
              {catalogError}
            </p>
          )}

          {workflows.length > 0 ? (
            <section
              aria-label="Workflow library"
              tabIndex={0}
              className="scrollbar-thin min-w-0 overflow-x-auto overflow-y-hidden pb-4 focus-visible:outline-text-link"
            >
              {visibleWorkflows.length === 0 && (
                <div role="status" className="py-12 text-sm text-text-dimmed">
                  No matching workflows.
                </div>
              )}
              <div className="flex w-max flex-nowrap gap-4">
                {visibleWorkflows.map((workflow) => {
                  const repositoryBacked = Boolean(workflow.sourceCommitSha);
                  return (
                    <article
                      key={workflow.workspaceKey}
                      className="flex h-60 w-72 shrink-0 flex-col rounded-lg border border-grid-bright bg-background-dimmed p-5 transition-colors hover:border-workflows/50 sm:w-80"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-workflows/10">
                          <WorkflowIcon className="size-4 text-workflows" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2
                            className="line-clamp-2 break-words text-sm font-medium text-text-bright"
                            title={workflow.name}
                          >
                            {workflow.name}
                          </h2>
                          <div className="mt-1 flex items-center gap-1.5 text-xxs text-text-dimmed">
                            {repositoryBacked ? (
                              <GitBranchIcon className="size-3.5" />
                            ) : (
                              <HardDriveIcon className="size-3.5" />
                            )}
                            <span>{repositoryBacked ? "Repository" : "Local workspace"}</span>
                          </div>
                        </div>
                      </div>

                      <Paragraph
                        variant="extra-small/dimmed"
                        className="mt-4 line-clamp-2 min-h-8 break-words"
                      >
                        {workflow.description || workflow.workflowId}
                      </Paragraph>
                      <div
                        className={`mt-3 flex items-center gap-1.5 text-xs ${workflow.status === "VALID" ? "text-success" : "text-warning"}`}
                      >
                        {workflow.status === "VALID" ? (
                          <CheckCircle2Icon className="size-3.5" />
                        ) : (
                          <AlertTriangleIcon className="size-3.5" />
                        )}
                        {workflow.status === "VALID" ? "Valid" : "Needs attention"}
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-grid-dimmed pt-3">
                        <span className="text-xxs text-text-dimmed">
                          {workflow.nodeCount ?? 0} node{workflow.nodeCount === 1 ? "" : "s"}
                        </span>
                        <div className="flex items-center gap-2">
                          <LinkButton
                            variant="minimal/small"
                            to={workflowHref(workflow, "source")}
                            LeadingIcon={Code2Icon}
                          >
                            Source
                          </LinkButton>
                          <LinkButton
                            variant="primary/small"
                            to={workflowHref(workflow, "editor")}
                            TrailingIcon={ArrowRightIcon}
                          >
                            Open
                          </LinkButton>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="flex min-h-72 max-w-2xl items-center py-10">
              <div className="flex items-start gap-4">
                {catalogError ? (
                  <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-400" />
                ) : (
                  <WorkflowIcon className="mt-0.5 size-5 shrink-0 text-text-dimmed" />
                )}
                <div>
                  <h2 className="text-sm font-medium text-text-bright">
                    {catalogError ? "Workflows could not be loaded" : "No workflows yet"}
                  </h2>
                  <Paragraph variant="small/dimmed" className="mt-2 max-w-lg">
                    {catalogError ??
                      "Connect a GitHub repository that contains Flowcordia workflows, then synchronize it here."}
                  </Paragraph>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {catalogError ? (
                      <>
                        <Button
                          type="button"
                          variant="primary/small"
                          LeadingIcon={RefreshCwIcon}
                          isLoading={syncFetcher.state !== "idle"}
                          disabled={!canWrite}
                          onClick={synchronize}
                        >
                          Try again
                        </Button>
                        <LinkButton variant="secondary/small" to={integrationsPath}>
                          Check repository
                        </LinkButton>
                      </>
                    ) : (
                      <>
                        <LinkButton variant="primary/small" to={repositorySetupPath}>
                          Set up repository
                        </LinkButton>
                        <Button
                          type="button"
                          variant="secondary/small"
                          LeadingIcon={RefreshCwIcon}
                          isLoading={syncFetcher.state !== "idle"}
                          disabled={!canWrite}
                          onClick={synchronize}
                        >
                          Synchronize
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </PageBody>
    </PageContainer>
  );
}
