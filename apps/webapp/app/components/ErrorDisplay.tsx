import { HomeIcon, RotateCwIcon, TreeDeciduousIcon } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { flowErrorDisplay } from "~/utils/flowError";
import { permissionDeniedMessage } from "~/utils/permissionDenied";
import { Button, LinkButton } from "./primitives/Buttons";
import { Paragraph } from "./primitives/Paragraph";
import { PermissionDenied } from "./PermissionDenied";
import { type ReactNode, useEffect } from "react";

type ErrorDisplayOptions = {
  button?: {
    title: string;
    to: string;
  };
};

export function RouteErrorDisplay(options?: ErrorDisplayOptions) {
  const error = useRouteError();
  const display = flowErrorDisplay(error);
  useEffect(() => {
    if (display.status >= 500) console.error("Flowcordia route error", error);
  }, [error, display.status]);

  // A failed `authorization` check (or `throwPermissionDenied`) throws a 403
  // that bubbles to the nearest route ErrorBoundary. Every layout boundary
  // renders through here, so handling it once means a gated route only has to
  // declare `authorization` to get the permission panel: no per-route boundary.
  const permission = isRouteErrorResponse(error) ? permissionDeniedMessage(error.data) : null;
  if (permission) {
    return (
      <div className="flex min-h-0 w-full items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-md">
          <PermissionDenied message={permission} />
        </div>
      </div>
    );
  }

  return (
    <ErrorDisplay
      {...display}
      {...options}
      button={display.signIn ? { title: "Sign in", to: "/login" } : options?.button}
    />
  );
}

type DisplayOptionsProps = {
  title: string;
  message?: ReactNode;
  status?: number;
  retryable?: boolean;
} & ErrorDisplayOptions;

export function ErrorDisplay({
  title,
  message,
  button,
  status,
  retryable = false,
}: DisplayOptionsProps) {
  return (
    <section
      aria-label="Flowcordia error"
      className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto bg-background-dimmed px-6 py-10"
    >
      <div className="my-auto flex w-full max-w-md flex-col items-center gap-5 text-center">
        <div
          aria-hidden="true"
          className="flowcordia-error-tree flex h-28 items-center justify-center text-workflows"
        >
          <TreeDeciduousIcon className="size-24" strokeWidth={1} />
        </div>
        <span className="text-xs font-medium text-text-dimmed">
          {status ? `FlowError / ${status}` : "Flowcordia"}
        </span>
        <h1 className="text-2xl font-semibold text-text-bright">{title}</h1>
        {message && (
          <Paragraph className="max-w-sm text-sm font-normal leading-6">{message}</Paragraph>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {retryable && (
            <Button
              variant="primary/medium"
              LeadingIcon={RotateCwIcon}
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
          )}
          <LinkButton
            to={button ? button.to : "/"}
            shortcut={{ modifiers: ["mod"], key: "g" }}
            variant={retryable ? "secondary/medium" : "primary/medium"}
            LeadingIcon={HomeIcon}
          >
            {button ? button.title : "Back to workspace"}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
