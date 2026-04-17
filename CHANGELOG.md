# Changelog

All notable project milestones for `MeshFree` are documented in this file.

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
