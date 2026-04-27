# MeshFree Docs Index

## Core Product Docs

- Chinese MVP spec: `mvp-spec.zh-CN.md`
- English MVP spec: `mvp-spec.en.md`
- Chinese API design: `api-design.zh-CN.md`
- English API design: `api-design.en.md`
- Chinese multi-format preview workflow: `multi-format-preview-workflow.zh-CN.md`

## Release Docs

- Chinese v0.1.0 release notes: `releases/v0.1.0.zh-CN.md`
- English v0.1.0 release notes: `releases/v0.1.0.en.md`
- Chinese v0.3.0-beta.2 release notes: `releases/v0.3.0-beta.2.zh-CN.md`
- English v0.3.0-beta.2 release notes: `releases/v0.3.0-beta.2.en.md`
- Repository changelog: `../CHANGELOG.md`

## Deployment Docs

- Chinese full deployment guide: `deployment-guide.zh-CN.md`
- English full deployment guide: `deployment-guide.en.md`
- Chinese short deployment checklist: `deployment-checklist.zh-CN.md`
- Chinese server maintenance guide: `server-maintenance.zh-CN.md`

## Session Notes

Session notes are stored in `session-notes/`.

Current notes:

- `session-notes/20260410_requirements-and-initialization-prep.md`
- `session-notes/20260411_1_scaffold-and-connectivity-check.md`
- `session-notes/20260411_2_mvp-implementation-roadmap.md`
- `session-notes/20260411_3_prep-infra-completed.md`
- `session-notes/20260415_1_three-core-loops-completed.md`
- `session-notes/20260415_2_deployment-discussion-summary.md`
- `session-notes/20260416_1_deployment-started-and-docs-refined.md`
- `session-notes/20260416_2_deployment-successfully-completed.md`
- `session-notes/20260418_1_navigation-structure-and-ui-adjustments.md`
- `session-notes/20260418_2_home-hero-geometry-execution-handoff.md`
- `session-notes/20260418_3_homepage-modal-and-motion-progress.md`
- `session-notes/20260419_1_glb-preview-and-viewer-iteration.md`
- `session-notes/20260420_1_tag-governance-and-localization-upgrade.md`
- `session-notes/20260420_2_navigation-about-and-beta-prep.md`
- `session-notes/20260426_english-copy-for-retranslation.md`
- `session-notes/20260426_2_weekly-summary-0420-0426.md`
- `session-notes/prompt.md`

## Recommended Reading Order

If you want to understand the project quickly, read in this order:

1. `mvp-spec.zh-CN.md` or `mvp-spec.en.md`
2. `api-design.zh-CN.md` or `api-design.en.md`
3. `multi-format-preview-workflow.zh-CN.md` when the task involves multi-format upload, conversion, preview, or admin preview control
4. `deployment-guide.zh-CN.md` if you are preparing deployment
5. `deployment-checklist.zh-CN.md` when you are ready to execute deployment step by step
6. `server-maintenance.zh-CN.md` when you want day-to-day server operations guidance
7. `session-notes/` only when you need old project history or decision context

## Notes

- Keep real secrets out of the repository
- Do not commit `.env`
- Do not commit database files or uploaded files
