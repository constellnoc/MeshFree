# Changelog

All notable project milestones for `MeshFree` are documented in this file.

## v0.3.0-beta.2 - 2026-04-27

This beta focuses on completing admin-side tag governance, improving tag selection behavior, and aligning documentation with the current review workflow.

### Added

- Admin APIs for raw custom tag handling:
  - ignore a private custom tag
  - resolve a private custom tag to an existing public tag
  - create a new public tag from a private custom tag
  - create a new public tag directly from the admin panel
- Admin dashboard UI for handling private custom tags in place
- Inline admin forms for creating governed public tags and resolving raw custom tags
- Current `v0.3.0-beta.2` release notes in Chinese and English

### Changed

- Upgraded the admin dashboard from read-only raw-tag display to actionable tag-governance flow
- Changed homepage public tag filtering from single-select to multi-select
- Improved selected-tag visibility in both public and admin selection surfaces
- Unified the current Chinese terminology around `Gallery`, `Dashboard`, and admin-facing tag actions
- Updated the root `README`, docs index, prompt notes, and API docs to reflect the current beta state

### Validation

- `server` build passes
- `client` build passes
- Lint checks for the files touched in this beta pass

### Current Limitations

- Alias creation / merge flow for private custom tags is still not implemented
- Full multilingual UI switching still needs more end-to-end polishing
- The repository still contains some older frontend lint issues outside the scope of this beta
- Viewer bundle size remains relatively large

### Release Docs

- `docs/releases/v0.3.0-beta.2.en.md`
- `docs/releases/v0.3.0-beta.2.zh-CN.md`

## v0.1.0 - 2026-04-17

This is the first formal MVP release milestone for `MeshFree`.

### Added

- Public home page for browsing approved model resources.
- Public model detail page with ZIP download.
- Public submission form with cover image and ZIP upload.
- Single-admin login flow and review dashboard.
- Chinese and English MVP specification and API design documents.
- Chinese and English deployment guides plus a Chinese server maintenance guide.

### Changed

- Tightened production `CORS` configuration for the deployed environment.
- Added basic rate limits for admin login and public submission endpoints.
- Updated the site from a dark visual theme to a light visual theme.

### Deployment Status

- Real server deployment has been completed.
- Current basic verification has not revealed obvious problems.

### Current Limitations

- No normal user registration or login.
- No search or category filtering.
- No comments, favorites, or likes.
- No 3D online preview.
- Uploaded files are stored on the server local disk.
