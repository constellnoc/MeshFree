# MeshFree MVP Specification

## 1. Project Overview

`MeshFree` is a lightweight model upload and download website built for MVP demonstration.

The main goals are:

- Allow public visitors to browse and download approved model resources
- Allow public visitors to submit model resources for review
- Allow only one administrator to log in and review submissions
- Keep the first version simple, stable, and easy to deploy

## 2. Target Users

The MVP currently serves three practical roles:

- Public visitors who browse and download approved resources
- Public submitters who upload new resources for review
- One administrator who reviews and manages all submissions

## 3. Role Permissions

### Public Visitor

Public visitors can:

- View approved model list
- View model detail page
- Download approved model ZIP files
- Submit new model resources

Public visitors cannot:

- Register
- Log in as normal users
- Access admin pages
- Review or delete submissions

### Administrator

The administrator can:

- Log in with username and password
- View all submissions
- Review pending submissions
- Approve submissions
- Reject submissions with a reason
- Delete submissions and related files

## 4. MVP Feature Scope

### Included Features

- Public home page
- Public model detail page
- Public submission form
- Public ZIP download
- Admin login
- Admin review page
- Submission status management

### Excluded Features

The first version does not include:

- User registration
- Normal user login
- Search
- Category filtering
- Comments
- Favorites
- Likes
- 3D online preview
- Notification system
- Batch upload
- Docker deployment
- Object storage
- Anti-hotlink protection
- Large file resume upload

## 5. Resource Rules

### Model File

- Only `.zip` files are allowed
- Maximum file size: `20MB`
- Stored on local server disk

### Cover Image

- Cover image is required
- Allowed formats: `jpg`, `jpeg`, `png`, `webp`
- Maximum file size: `2MB`
- Stored on local server disk

### Submission Fields

Each submission contains:

- Title
- Description
- Contact info
- Cover image
- ZIP file
- Review status
- Reject reason
- Created time
- Reviewed time

## 6. Contact Field

The submission form must include a contact field:

`Contact info (QQ / WeChat / Email)`

This field is required because there is no user account system in the MVP. The administrator may need to contact the submitter after review.

## 7. Submission Status

Each submission has one of the following statuses:

- `pending`: waiting for review
- `approved`: approved and visible to the public
- `rejected`: rejected and hidden from the public

## 8. Review Rules

### Approval

When a submission is approved:

- Its status becomes `approved`
- It becomes visible on the public pages
- It becomes downloadable

### Rejection

When a submission is rejected:

- Its status becomes `rejected`
- It remains stored in the database
- A reject reason must be saved

## 9. Public Display Rules

The home page only shows approved resources.

Each model card includes:

- Cover image
- Title
- Short description

The home page does not show:

- Download count
- Category
- Tags
- Author profile

## 10. Download Rules

- Public download does not require login
- Only approved resources can be downloaded
- Downloads are served through backend API
- The first version does not implement anti-hotlink protection

## 11. Admin Rules

- Only one admin account exists
- No public registration is available
- Admin authentication uses username and password
- Admin pages are protected
- All review operations require admin authentication

## 12. File Deletion Strategy

When an admin deletes a submission:

- The database record is deleted
- The related cover image file is deleted
- The related ZIP file is deleted

This strategy keeps the database and local file storage consistent.

## 13. Recommended Tech Stack

- Frontend: `React + TypeScript + Vite`
- Backend: `Node.js + Express + TypeScript`
- Database: `SQLite`
- ORM: `Prisma`
- Process manager: `PM2`
- Reverse proxy: `Nginx`
- Deployment OS: `Ubuntu`
- Storage: local disk

## 14. Deployment Constraints

Current server resources:

- `2 CPU`
- `2GB RAM`
- `40GB SSD`
- `200GB/month traffic`
- `3Mbps bandwidth`

Because of these limits, the MVP should:

- Keep file size limits strict
- Use local file storage
- Avoid complex infrastructure
- Prioritize stability over advanced features

### Public Deployment Baseline Constraints

At the current MVP stage, public deployment should also follow these baseline constraints:

- Frontend and backend should preferably be deployed under the same domain, with `Nginx` as the unified entry point
- Production `CORS` should be restricted so that only the real site domains can access the backend API
- The admin login endpoint should have basic rate limiting
- The public submission endpoint should have basic rate limiting

These constraints are not feature expansion. They are baseline safeguards to help the current MVP run more safely on the public internet.

## 15. Product Goal

This MVP is not intended to be a large production platform.

The goal is to build a project that is:

- Runnable
- Demonstrable
- Easy to explain in presentation
- Reasonably structured
- Easy to maintain during the competition
