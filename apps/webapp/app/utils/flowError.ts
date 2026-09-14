import { isRouteErrorResponse } from "@remix-run/react";

export function flowErrorDisplay(error: unknown) {
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const messages: Record<number, { title: string; message: string }> = {
    400: {
      title: "Check your request",
      message: "Some information is missing or invalid. Go back and check the details.",
    },
    401: {
      title: "Sign in to continue",
      message: "Your session may have expired. Sign in again to continue.",
    },
    403: {
      title: "Access is restricted",
      message:
        "You do not have permission to open this page. Ask your workspace administrator for access.",
    },
    404: {
      title: "This page isn't here",
      message: "The link may have changed, or this item may no longer be available.",
    },
    409: {
      title: "This item has changed",
      message: "Another update was saved. Reload to get the latest version before trying again.",
    },
    429: {
      title: "Let's give it a moment",
      message: "Too many requests arrived at once. Wait a moment before trying again.",
    },
  };
  return {
    status,
    ...(messages[status] ?? {
      title: "FlowError",
      message: "Something interrupted this page. Try reloading, or return to your workspace.",
    }),
    retryable: status >= 500 || status === 409 || status === 429,
    signIn: status === 401,
  };
}
