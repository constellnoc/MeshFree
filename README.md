# MeshFree

`MeshFree` is a lightweight 3D model gallery and submission platform for MVP-scale review workflows.

It focuses on one simple loop:

- submit model packages as `ZIP`
- review them in an admin workflow
- publish approved resources for public browsing and download

## Key Capabilities

- Public gallery for approved model resources
- Public model detail pages
- Public `ZIP` download
- Public submission flow with cover image and model package upload
- Admin login and submission review
- Governed public tags with search and filtering
- Admin-side raw custom tag governance
- First `GLB` preview workflow for uploaded packages

## Tech Stack

- Frontend: `React + TypeScript + Vite`
- Backend: `Node.js + Express + TypeScript`
- Database: `SQLite`
- ORM: `Prisma`
- Process manager: `PM2`
- Reverse proxy: `Nginx`

## Repository Structure

- `client/`: frontend application
- `server/`: backend application
- `docs/`: product, API, workflow, deployment, and maintenance docs

## Quick Start

### 1. Install dependencies

```bash
cd client
npm install

cd ../server
npm install
```

### 2. Prepare server environment

Copy `server/.env.example` to `server/.env`, then set your local values.

### 3. Start development servers

Frontend:

```bash
cd client
npm run dev
```

Backend:

```bash
cd server
npm run dev
```

### 4. Optional local setup helpers

Seed admin account:

```bash
cd server
npm run db:seed
```

## Documentation

Main entries:

- Docs guide: `docs/README.md`
- Chinese MVP spec: `docs/mvp-spec.zh-CN.md`
- English MVP spec: `docs/mvp-spec.en.md`
- Chinese API design: `docs/api-design.zh-CN.md`
- English API design: `docs/api-design.en.md`
- Chinese multi-format preview workflow: `docs/multi-format-preview-workflow.zh-CN.md`
- Changelog: `CHANGELOG.md`

Release notes are stored in `docs/releases/`.

## Notes

- Keep real secrets out of the repository
- Do not commit `.env`
- Do not commit real admin passwords
- Do not commit `JWT_SECRET`
- Do not commit database files or uploaded files
