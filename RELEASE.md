# Releasing Flowcordia

Flowcordia source releases and self-host container images are separate publication steps.
Do not mark an image available until its build, registry push, attestation verification, and
release-manifest generation have succeeded.

## Versioned Self-host Images

1. Merge the reviewed source revision into `main`.
2. In Actions, run **Flowcordia publish self-host image** from `main`.
3. Supply a unique release ID, semantic version (for example `0.1.0-beta.1`), and the reviewed
   upstream execution-foundation commit. Do not use an arbitrary current upstream SHA.
4. Wait for the complete workflow to succeed.
5. Download the matching release manifest, publication evidence, and attestation bundle.
6. Create a GitHub prerelease attached to that exact application commit and upload those artifacts.
7. Include the immutable GHCR image digest in its release notes.

The workflow publishes to `ghcr.io/<repository-owner>/<repository-name>` and refuses to overwrite
an existing version tag. Its environment is `flowcordia-self-host-release`; restrict it to
`main` and configure any maintainer approval requirements.

For this repository, the package namespace is `ghcr.io/flowcordia/flowcordia`.
Make the package publicly pullable before announcing a public container release. Repository
visibility alone is not proof of package visibility; verify an unauthenticated pull or manifest request.

## What a Release Includes

- The exact source commit and version.
- Container digest, platform, and build provenance.
- `flowcordia-release-manifest.json`.
- Publication evidence and attestation bundle.
- Setup instructions, known limitations, upgrade considerations, and rollback guidance.

Start with the [image publication runbook](flowcordia/runbooks/self-host-image-publication.md)
and the [beta quickstart](flowcordia/runbooks/open-source-beta.md).

## Publication Controls

Automatic webapp/worker image publishing is disabled unless maintainers set
`FLOWCORDIA_AUTO_PUBLISH_IMAGES=1`. Use the versioned self-host workflow for the initial beta.
Inherited npm release workflows are not the Flowcordia application release process.

GitHub Issues is for reproducible bugs; Discussions has Q&A, Ideas, and Announcements.
Report security issues privately using [SECURITY.md](SECURITY.md).

A successful image build is not an end-to-end installation guarantee. Publish the checks actually
performed and keep unverified installation, integration, and production claims explicit.
