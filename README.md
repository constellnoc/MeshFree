# MeshFree

`MeshFree` is a lightweight model upload and download website built for MVP demonstration.

Current formal release milestone: `v0.1.0`

The current repository already includes the three core MVP loops:

- Public model browsing and detail view
- Public ZIP download
- Public submission with file upload
- Admin login and submission review

## Current Status

The project is no longer only in initialization.

Current status:

- `client` and `server` scaffolding completed
- `Prisma + SQLite` connected and working
- Public model list/detail/download flow connected to real data
- Public submission flow connected to real upload and database logic
- Admin login and review flow connected to real database and JWT auth
- Chinese and English MVP / API documents completed
- Chinese and English deployment guides completed
- Real server deployment completed
- Current basic testing has not revealed obvious problems

## Release

- Release branch: `release/v0.1.0`
- Release tag: `v0.1.0`
- Release notes (ZH): `docs/releases/v0.1.0.zh-CN.md`
- Release notes (EN): `docs/releases/v0.1.0.en.md`
- Change log: `CHANGELOG.md`

## Tech Stack

- Frontend: `React + TypeScript + Vite`
- Backend: `Node.js + Express + TypeScript`
- Database: `SQLite`
- ORM: `Prisma`
- Process manager: `PM2`
- Reverse proxy: `Nginx`

## MVP Features

- Public home page for approved models
- Public model detail page
- Public ZIP download
- Public submission form with cover image and ZIP upload
- Single-admin login
- Admin submission review, reject, approve, and delete

## Project Structure

- `client/`: frontend application
- `server/`: backend application
- `docs/`: specifications, API documents, deployment guides, and session notes

## Documentation

Core documents:

- Chinese MVP spec: `docs/mvp-spec.zh-CN.md`
- English MVP spec: `docs/mvp-spec.en.md`
- Chinese API design: `docs/api-design.zh-CN.md`
- English API design: `docs/api-design.en.md`
- Chinese release notes: `docs/releases/v0.1.0.zh-CN.md`
- English release notes: `docs/releases/v0.1.0.en.md`
- Change log: `CHANGELOG.md`

Deployment guides:

- Chinese deployment guide: `docs/deployment-guide.zh-CN.md`
- English deployment guide: `docs/deployment-guide.en.md`

Progress notes:

- Session notes are stored in `docs/session-notes/`

## Deployment Summary

The current deployment setup is based on:

- `Ubuntu 22.04`
- `Node.js 20 LTS`
- `PM2`
- `Nginx`
- `SQLite`
- local uploads
- primary domain `yukiho.site`

The deployment documentation is still kept in the repository for reproducibility and maintenance:

- `docs/deployment-guide.zh-CN.md`
- `docs/deployment-guide.en.md`

## Notes

- Do not commit `.env`
- Do not commit real admin passwords
- Do not commit `JWT_SECRET`
- Do not commit database files or uploaded files
