# Studio API (Beta)

The dashboard and token API use the same Studio workspace handlers. Workflow
validation, version conflicts, tests, releases, repository commands, connections,
and variables therefore share the dashboard's service implementations.

## Authentication and scope

Create a personal access token in Account > Access tokens. Send it as
`Authorization: Bearer <personal-access-token>`; dashboard cookies are not accepted.
The token owner must belong to the organization and have the relevant environment
permissions. Studio must also be enabled for that user. Treat the token as a secret.

Base endpoint:

```text
/api/v1/flowcordia/orgs/:organizationSlug/projects/:projectParam/env/:envParam/studio
```

`GET` without a workflow selector returns the workflow library. Select an existing
workspace with `?_studioWorkspace=<workspaceKey>` from the library response, or a
repository workflow with `?workflow=<workflowId>`. A selected response includes
`workspace`, `generatedSource`, `latestRelease`, `currentRelease`, and `releaseHistory`.
The API accepts GET and POST only and returns JSON rather than login redirects.

```bash
curl "$STUDIO_URL" -H "Authorization: Bearer $FLOWCORDIA_PAT"
curl "$STUDIO_URL" -H "Authorization: Bearer $FLOWCORDIA_PAT" \
  -H 'Content-Type: application/json' \
  --data '{"intent":"test","expectedVersion":"3","input":{"example":true}}'
```

Set `STUDIO_URL` to the selected workspace URL on your own installation. Always use
the version returned by the latest successful save, not the example version above.

## POST commands

| Intent | Additional JSON fields | Result |
| --- | --- | --- |
| `save` | `expectedVersion`, `document` | Canonical workflow and new version |
| `source_save` | `expectedVersion`, `sourceProject` | Saved TypeScript files/dependencies; new version |
| `test` | `expectedVersion`, `input`; optional `retryFailedDeployment` | Worker warming, running, or completed state |
| `test_status` | `expectedVersion`, `runId` | Run status, node traces, result |
| `cancel_test` | `expectedVersion`, `runId` | Cancellation of the exact scoped test |
| `source_test` | `expectedVersion`, `input`; optional `retryFailedDeployment` | Independent Source worker test |
| `stage` | `expectedVersion` | Immutable release from the successfully tested version |
| `deploy` | `releasePublicId` | Build/deploy that staged release |
| `rollback` | `releasePublicId` | Promote an already deployed release in this workspace/environment |
| `repository_sync` | None | Read GitHub and refresh the local workflow index |
| `repository_pull` | `expectedVersion`; URL `workflow` selector | Import the indexed repository workflow |
| `repository_push` | `expectedVersion`; URL `workflow` selector | Create the governed GitHub proposal; remote write |
| `activepieces_api` | `method`, `path`; optional `query`, `body` | Studio node catalog, connections, variables, and supported compatibility operations |

Workflow tests use the real Trigger.dev worker, not browser execution. If `test`
returns `warming`, repeat it after a short delay. Once it returns `running`, poll
`test_status` with its `runId`; repeatedly submitting `test` starts new runs.
For Source, repeat `source_test` with the same version/input until terminal.
Poll GET after deploy until `latestRelease.status` becomes `DEPLOYED` or `FAILED`.
The first worker build is slower than a warm test.

Environment task execution continues to use Trigger.dev's existing APIs:

```text
POST /api/v1/tasks/:taskId/trigger    {"payload":{...}}
GET  /api/v3/runs/:runId
```

Those calls take the target **environment API key**, not the Studio PAT. A deployed
release exposes its `taskId`. Deployment promotion is environment-wide; test the
release lifecycle in an isolated environment before changing a shared deployment.

## Catalog, credentials, and variables

Example catalog request (POST to the same selected Studio URL):

```json
{"intent":"activepieces_api","method":"GET","path":"/v1/pieces","query":{"searchQuery":"http"}}
```

The same transport supports `/v1/app-connections` and `/v1/variables`, including
their supported create, update, and delete operations. Connection and variable
responses are redacted; variable reveal is a separate authorized operation.
Never put credentials in a workflow document or generated source. A catalog entry
means a piece is available, not that its third-party authentication and every
action have been verified. Some upstream runtime capabilities remain unsupported.

## Failure handling and local networking

- `400`: invalid command/document, failed test gate, or invalid operation.
- `401`: missing, invalid, or revoked PAT.
- `403`: insufficient permissions.
- `404`: unavailable organization/project/environment or Studio access.
- `409`: stale workspace version or conflicting operation. Reload and resolve;
  do not silently overwrite another editor's changes.
- `500`: unexpected service failure; check server logs without exposing secrets.

For Docker-only local workers, the app's `API_ORIGIN` must resolve **from workers**.
The development compose default is `http://app:3030` on the shared app network;
`APP_ORIGIN` and `LOGIN_ORIGIN` remain the browser-facing localhost URL. Override
`API_ORIGIN` with an address reachable by both clients and workers when also using
the CLI outside Docker. Production should use the installation's reachable HTTPS
API origin. Do not change the runtime's default-deny HTTP egress policy globally;
allow only the external origins required by a workflow.
