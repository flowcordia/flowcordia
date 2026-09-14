<picture>
  <source media="(prefers-color-scheme: dark)" srcset="apps/webapp/public/brand/flowcordia-logo-white.svg">
  <img src="apps/webapp/public/brand/flowcordia-logo-black.svg" alt="Flowcordia" width="72">
</picture>

# Flowcordia

**Open-source workflow automation with a visual builder, TypeScript source editor, and durable execution.**

Build workflows in Studio, write TypeScript in Source, connect GitHub repositories, and inspect
runs from one self-hosted application.

[Website](https://flowcordia.com) |
[Self-hosting](flowcordia/runbooks/open-source-beta.md) |
[API](flowcordia/runbooks/studio-api.md) |
[Contributing](CONTRIBUTING.md) |
[Support](SUPPORT.md)

> **Beta candidate, not a production guarantee.** Start with synthetic data and a single-server
> installation. Validate your own Save -> Test -> Stage -> Deploy -> Execute -> Rollback journey
> before using real credentials. See the [release gates](flowcordia/product/release-readiness.md).

## What You Can Build

- API automation: HTTP requests, data mapping, conditions, loops, and scheduled workflows.
- Internal tools: repository-backed workflows with reviewable changes and environment-specific credentials.
- Durable background jobs: retries, delays, wait-until steps, queues, and execution history.
- TypeScript workflows: independent source projects with dependencies and worker-backed tests.

## Inside Flowcordia

| Area | Purpose |
| --- | --- |
| Studio | Visual workflow authoring, node configuration, step tests, and input/output inspection |
| Source | TypeScript editing with Sandpack, files, dependencies, and separate test results |
| GitHub | GitHub App connections, repository synchronization, proposal branches, and pull requests |
| Execution | Workers, durable waits, retries, cancellation, staging, deployment, and rollback |
| Credentials | Encrypted secrets and environment variables, referenced instead of embedded in workflow code |
| Observability | Runs, logs, errors, traces, and query tools |
| API | Authenticated Studio operations using the same server handlers as the dashboard |

Studio and Source share platform services, but arbitrary TypeScript does **not** round-trip into
a visual graph. Browser editing is not browser execution: task code runs through the execution
worker. A listed integration also does not imply that every provider action has been verified
against live credentials.

## Start Here

### Self-host the Beta

Use the [open-source beta quickstart](flowcordia/runbooks/open-source-beta.md) for the supported
Linux `amd64`, Docker Compose, single-server path. It covers prerequisites, secrets, GitHub App
setup, first-owner signup, and installation acceptance.

Use an exact release image digest and its matching manifest when release artifacts are available.
A source checkout or green CI run alone is not a validated installable release.

On a fresh installation, open `/setup/owner` to create the first administrator's email and password.
That route closes after the owner is created. Configure email before invitations and password
recovery.

### Develop from Source

Requirements: Node.js `20.20.2`, pnpm `10.33.2`, Docker, and the services/configuration described
in [CONTRIBUTING.md](CONTRIBUTING.md).

From your checkout:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Then follow [local setup](CONTRIBUTING.md#setup) for environment variables, services, database
migrations, builds, and the webapp at `http://localhost:3030`. Starting the webapp alone does not
start an execution worker.

## API and Automation

The [Studio API guide](flowcordia/runbooks/studio-api.md) documents personal-access-token
authentication, organization membership checks, workspace reads, and workflow commands.

```text
/api/v1/flowcordia/orgs/:organizationSlug/projects/:projectParam/env/:envParam/studio
```

Use environment-specific authorization and never commit access tokens, private keys, or credential
values. See [security reporting](SECURITY.md) and the [compatibility policy](flowcordia/product/compatibility-policy.md).

## Repository Map

| Path | Contents |
| --- | --- |
| `apps/webapp` | Dashboard, authentication, setup, and API |
| `apps/flowcordia-studio-activepieces` | Embedded Studio host and platform bridge |
| `packages/flowcordia-workflow` | Workflow schema, nodes, validation, and source contracts |
| `packages/flowcordia-runtime` | Compilation, adapters, and execution integration |
| `packages/flowcordia-control-plane` | Durable workflow state, audit, and reconciliation |
| `packages/flowcordia-github-workflows` | Repository-backed workflow storage |
| `packages/flowcordia-github-proposals` | Proposal branches, pull requests, and exact-head promotion |
| `studio-v2` | Vendored editor foundations and separately licensed references |
| `docker` | Local development and self-host deployment tooling |
| `flowcordia` | Architecture, capability matrix, security boundaries, and runbooks |

## Documentation

- [Engineering index](flowcordia/README.md)
- [Capability matrix](flowcordia/product/capability-matrix.md)
- [Bundled deployment](flowcordia/runbooks/bundled-self-host-deployment.md)
- [Diagnostics](flowcordia/runbooks/self-host-diagnostics.md)
- [Release acceptance](flowcordia/runbooks/release-acceptance.md)
- [Contribution requirements](flowcordia/CONTRIBUTING.md)

## Contribute

Report a reproducible bug, improve documentation, or propose a focused feature through this
repository's Issues tab. Include the commit/version and a small synthetic reproduction.
Open pull requests against `main` as drafts until the relevant checks pass.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md), and the
[Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately through [SECURITY.md](SECURITY.md).

## Scope and Limitations

The beta targets GitHub-first, single-server self-hosting. It does not promise high availability,
managed hosting, service-level agreements, universal integration compatibility, or production
readiness merely because a container is healthy. See [release readiness](flowcordia/product/release-readiness.md)
for the required evidence and remaining gates.

## License and Attribution

Flowcordia-authored code is licensed under [Apache 2.0](LICENSE). The execution foundation derives
from Trigger.dev, and Studio incorporates Activepieces Community Edition code under its original
license. Vendored code and reference sources retain their own notices and licensing boundaries.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Required attribution and compatibility package
identifiers remain in the repository; the Flowcordia branding does not change their licenses.
