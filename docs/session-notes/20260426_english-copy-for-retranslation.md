# English Copy For Retranslation

Source files:

- `client/src/lib/i18n.ts`
- `server/src/lib/tags.ts`

Note: This file lists English source text that currently has Chinese translations in the app or tag system. Dynamic parts are written as placeholders, for example `{date}`, `{errorMessage}`, `{maxTags}`.

## Navigation

- Gallery
- About
- Primary navigation
- Search
- Search models
- Sign in / Sign up
- Dashboard
- Upload
- Language switcher
- EN / 中

## Document Titles

- MeshFree-About
- MeshFree-Gallery
- MeshFree-Home
- MeshFree-Upload
- MeshFree-Sign in
- MeshFree-Dashboard
- MeshFree-Model
- MeshFree

## Footer

- A lightweight platform for 3D model sharing and review.
- Contact
- Copyright © 2026 Noctiluca

## Home And Gallery

- Open resources, open creativity.
- MeshFree is a lightweight platform for browsing, sharing, and reviewing 3D model resources.
- Browse gallery
- Upload
- Gallery
- Approved model resources
- Browse recommended tags and open approved resources without logging in.
- Upload a model
- Showing results for "{query}" in tag "{tag}".
- Clear filters
- Loading models
- The client is requesting `/api/models` from the backend.
- Unable to load models
- Failed to load approved models: {errorMessage}
- No matching models
- No approved models yet
- Try a different keyword or remove the active tag filter.
- The public gallery is empty right now. Once approved submissions exist, they will appear here automatically.
- Approved resource
- View details and download
- Created {date}

## Model Detail

- Loading model
- The client is requesting `/api/models/{id}`.
- Model unavailable
- Model not found.
- Failed to load model detail: {errorMessage}
- Back to home
- Close model preview
- Preview
- Model Preview
- Model Detail
- Created {date}
- Download ZIP
- Preparing 3D preview...

## Upload Page

- Public Upload
- Upload a model for admin review
- Upload one cover image and one ZIP file. After upload, the resource will stay in pending status until the administrator reviews it.
- Title
- Temple Asset Pack
- Description
- Describe the model pack and its intended use.
- Contact info (QQ / WeChat / Email)
- Email: your-name@example.com
- Preset tags
- Select up to {maxTags} public tags. These are the tags that can become visible after review.
- Suggested tags
- Suggest a new tag for admin review
- Add suggestion
- Suggested tags stay private. Only the administrator can decide whether they become a new public tag or an alias for an existing tag.
- Cover image
- Accepted: JPG, JPEG, PNG, WEBP. Max 2MB.
- Model ZIP
- Accepted: ZIP only. Max {maxMb}MB.
- Reset
- Uploading...
- Upload for review
- Text fields, selected preset tags, and suggested tags are saved locally in this browser. File inputs must be selected again after refresh or reset.
- Upload rules
- All fields are required.
- Only one cover image and one ZIP file are allowed.
- The model will become public only after admin approval.
- Upload ID
- Status
- Pending
- Approved
- Rejected
- Failed to upload. Please try again.
- Submission received successfully. Please wait for admin review.
- Please complete all required text fields.
- Please upload both a cover image and a ZIP file.
- Cover image must be a JPG, JPEG, PNG, or WEBP file.
- Cover image must not exceed 2MB.
- Model file must be a ZIP archive.
- Model ZIP must not exceed {maxMb}MB.
- Please select up to {maxTags} preset tags.
- Please use up to {maxTags} suggested tags.
- Each tag must be between {minLength} and {maxLength} characters.

## Admin Login

- Admin Access
- Sign in to the review dashboard
- Only the seeded administrator account can access review actions for pending submissions.
- Username
- Enter username
- Password
- Signing in...
- Sign in
- Review workflow
- After login, the dashboard lets the administrator:
- View all submissions or filter by review status.
- Inspect contact info, cover image, and stored ZIP name.
- Approve, reject, or delete a submission.
- Go to dashboard
- Open dashboard
- Please enter both username and password.
- Failed to log in. Please try again.

## Admin Dashboard

- Admin Dashboard
- Review submissions
- Select a record to inspect it and update its review status.
- Log out
- Pending
- Approved
- Rejected
- All
- Loading submissions...
- No submissions match the current filter.
- Created {date}
- No submission selected
- Choose an item from the list to inspect its details.
- Submission Detail
- Loading selected submission...
- Status
- Contact
- ZIP file
- Created
- Reviewed
- Reject reason
- Not reviewed yet
- Public tags
- Choose up to {maxTags} public tags. These are the only tags visible to visitors after approval.
- No public tags saved yet.
- Save tags
- Private suggested tags
- These suggestions are visible only to the administrator until they are reviewed.
- No private tag suggestions were submitted.
- Explain why this submission should be rejected.
- Download ZIP
- Approve
- Reject
- Delete
- Please select up to {maxTags} public tags.
- Please enter a reject reason before rejecting.
- Submission tags updated successfully.
- Submission approved successfully.
- Submission rejected successfully.
- Submission deleted successfully.

## 3D Viewer

- Viewer background color
- White
- Black
- Soft White
- Soft Black
- Switch background to {label}
- Reset view
- Close
- 3D preview is unavailable for this file.
- Loading model preview...
- Drag to rotate and scroll to zoom.
- {title} 3D preview viewer.

## Preset Tags

- Environment
- Character
- Weapon
- Prop
- Architecture
- Vehicle
- Nature
- Stylized
- Low Poly
- Sci-Fi

## Tag Aliases

- scene
- lowpoly
